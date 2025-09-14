import { Context } from '../types/koa';
import { ContactPerson, MedicalInstitution, User } from '../models';
import { createError } from '../middleware/errorHandler';
import Joi from 'joi';
import { logger } from '../utils/logger';
import { Op } from 'sequelize';

const contactSchema = Joi.object({
  firstName: Joi.string().required().trim().max(50),
  lastName: Joi.string().required().trim().max(50),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).allow('', null).optional(),
  title: Joi.string().max(100).allow('', null).optional(),
  department: Joi.string().max(100).allow('', null).optional(),
  isPrimary: Joi.boolean().default(false),
  institutionId: Joi.string().uuid().required(),
});

const updateContactSchema = contactSchema.fork([
    'firstName', 
    'lastName', 
    'email', 
    'institutionId'
], (schema) => schema.optional());

export class ContactController {

  private static async validateInstitutionAccess(
    user: User,
    institutionId: string,
    operation: string
  ): Promise<void> {
    // Super admins can access everything
    if (user.role === 'super_admin') {
      return;
    }

    const institution = await MedicalInstitution.findByPk(institutionId, {
      include: [
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'teamId']
        }
      ]
    });

    if (!institution) {
      throw createError('Institution not found', 404);
    }

    // Team admins can access institutions from their team
    if (user.role === 'team_admin' && user.teamId) {
      if (institution.assignedUser?.teamId === user.teamId || !institution.assignedUserId) {
        return;
      }
    }

    // Users can only access their own institutions
    if (institution.assignedUserId === user.id) {
      return;
    }

    // Admins can access everything
    if (user.role === 'admin') {
      return;
    }

    logger.warn(`Contact ${operation} access denied`, {
      userId: user.id,
      userTeamId: user.teamId,
      userRole: user.role,
      institutionId,
      institutionAssignedUserId: institution.assignedUserId,
      institutionTeamId: institution.assignedUser?.teamId,
    });

    throw createError(
      `Access denied: You can only ${operation} contacts for institutions you manage`,
      403,
      'INSTITUTION_ACCESS_DENIED'
    );
  }

  private static async validateContactAccess(
    user: User,
    contactId: string,
    operation: string
  ): Promise<ContactPerson> {
    const contact = await ContactPerson.findByPk(contactId, {
      include: [
        {
          model: MedicalInstitution,
          as: 'institution',
          include: [
            {
              model: User,
              as: 'assignedUser',
              attributes: ['id', 'teamId']
            }
          ]
        }
      ]
    });

    if (!contact) {
      throw createError('Contact not found', 404);
    }

    // Super admins can access everything
    if (user.role === 'super_admin') {
      return contact;
    }

    const institution = contact.institution;

    // Team admins can access contacts from their team's institutions
    if (user.role === 'team_admin' && user.teamId) {
      if (institution?.assignedUser?.teamId === user.teamId || !institution?.assignedUserId) {
        return contact;
      }
    }

    // Users can only access contacts from their own institutions
    if (institution?.assignedUserId === user.id) {
      return contact;
    }

    // Admins can access everything
    if (user.role === 'admin') {
      return contact;
    }

    logger.warn(`Contact ${operation} access denied`, {
      userId: user.id,
      userTeamId: user.teamId,
      userRole: user.role,
      contactId,
      institutionId: institution?.id,
      institutionAssignedUserId: institution?.assignedUserId,
      institutionTeamId: institution?.assignedUser?.teamId,
    });

    throw createError(
      `Access denied: You can only ${operation} contacts for institutions you manage`,
      403,
      'CONTACT_ACCESS_DENIED'
    );
  }

  public static async create(ctx: Context) {
    const { error, value } = contactSchema.validate(ctx.request.body);
    if (error) {
      throw createError(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const user = ctx.state.user as User;

    try {
      // Validate institution access
      await ContactController.validateInstitutionAccess(user, value.institutionId, 'create');

      if (value.isPrimary) {
        await ContactPerson.update(
          { isPrimary: false },
          { where: { institutionId: value.institutionId, isPrimary: true } }
        );
      }

      const contact = await ContactPerson.create(value);

      ctx.status = 201;
      ctx.body = {
        success: true,
        message: 'Contact created successfully',
        data: contact,
      };
      logger.info(`Contact ${contact.id} created by user ${ctx.state.user?.id}`);
    } catch (err: any) {
      logger.error('Error creating contact', { error: err.message, data: value });
      throw createError('Failed to create contact', 500);
    }
  }

  public static async list(ctx: Context) {
    const { limit = 20, offset = 0, institutionId, search } = ctx.query;
    const user = ctx.state.user as User;
    const where: any = {};

    if (institutionId && institutionId !== 'null' && institutionId !== 'undefined') {
      // Validate access to specific institution
      await ContactController.validateInstitutionAccess(user, institutionId as string, 'view');
      where.institutionId = institutionId;
    }

    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    try {
      // For now, simplify to avoid SQL complexity - super admins see all
      let contactIds: string[] | null = null;

      if (user.role !== 'super_admin') {
        // Get accessible contacts based on institution access
        const accessibleInstitutions = await MedicalInstitution.findAll({
          where: user.role === 'admin' ? {} : { assignedUserId: user.id },
          attributes: ['id']
        });

        const institutionIds = accessibleInstitutions.map(inst => inst.id);

        const accessibleContacts = await ContactPerson.findAll({
          where: { institutionId: { [Op.in]: institutionIds } },
          attributes: ['id']
        });

        contactIds = accessibleContacts.map(contact => contact.id);

        if (contactIds.length === 0) {
          // No accessible contacts
          ctx.body = {
            success: true,
            data: [],
            pagination: { total: 0, limit: Number(limit), offset: Number(offset) }
          };
          return;
        }

        // Add contact ID filter
        where.id = { [Op.in]: contactIds };
      }

      const { rows, count } = await ContactPerson.findAndCountAll({
        where,
        limit: Number(limit),
        offset: Number(offset),
        include: [
          {
            model: MedicalInstitution,
            as: 'institution',
            include: [
              {
                model: User,
                as: 'assignedUser',
                attributes: ['id', 'firstName', 'lastName'],
                required: false
              }
            ]
          }
        ],
        order: [['lastName', 'ASC'], ['firstName', 'ASC']],
      });

      ctx.body = {
        success: true,
        data: rows,
        pagination: { total: count, limit: Number(limit), offset: Number(offset) }
      };
    } catch (err: any) {
      logger.error('Error listing contacts', { error: err.message, userId: user.id });
      throw createError('Failed to retrieve contacts', 500);
    }
  }

  private static async getTeamMemberIds(teamId: string): Promise<string[]> {
    const teamMembers = await User.findAll({
      where: { teamId },
      attributes: ['id']
    });
    return teamMembers.map(member => member.id);
  }
  public static async get(ctx: Context) {
    const { id } = ctx.params;
    const user = ctx.state.user as User;

    try {
      const contact = await ContactController.validateContactAccess(user, id, 'view');
      ctx.body = { success: true, data: contact };
    } catch (err: any) {
      logger.error(`Error getting contact ${id}`, { error: err.message, userId: user.id });
      if (err.status) throw err; // rethrow handled errors
      throw createError('Failed to retrieve contact', 500);
    }
  }

  public static async update(ctx: Context) {
    const { id } = ctx.params;
    const { error, value } = updateContactSchema.validate(ctx.request.body);
    const user = ctx.state.user as User;

    if (error) {
      throw createError(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    try {
      const contact = await ContactController.validateContactAccess(user, id, 'update');

      // If changing institution, validate access to new institution
      const institutionId = value.institutionId || contact.institutionId;
      if (value.institutionId && value.institutionId !== contact.institutionId) {
        await ContactController.validateInstitutionAccess(user, value.institutionId, 'update');
      }

      if (value.isPrimary) {
        await ContactPerson.update(
          { isPrimary: false },
          { where: { institutionId: institutionId, isPrimary: true, id: { [Op.ne]: id } } }
        );
      }

      await contact.update(value);

      const updatedContact = await ContactPerson.findByPk(id, {
        include: [{ model: MedicalInstitution, as: 'institution' }]
      });

      ctx.body = { success: true, message: 'Contact updated', data: updatedContact };
      logger.info(`Contact ${id} updated by user ${user.id}`);
    } catch (err: any) {
      logger.error(`Error updating contact ${id}`, { error: err.message, data: value, userId: user.id });
      if (err.status) throw err;
      throw createError('Failed to update contact', 500);
    }
  }

  public static async delete(ctx: Context) {
    const { id } = ctx.params;
    const user = ctx.state.user as User;

    try {
      const contact = await ContactController.validateContactAccess(user, id, 'delete');

      await contact.destroy();

      ctx.body = { success: true, message: 'Contact deleted' };
      logger.info(`Contact ${id} deleted by user ${user.id}`);
    } catch (err: any) {
      logger.error(`Error deleting contact ${id}`, { error: err.message, userId: user.id });
      if (err.status) throw err;
      throw createError('Failed to delete contact', 500);
    }
  }
}