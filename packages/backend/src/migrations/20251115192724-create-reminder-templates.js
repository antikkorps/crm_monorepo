'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('reminder_templates', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Template name for identification'
      },
      reminder_type: {
        type: Sequelize.ENUM('7_days_before', '3_days_before', 'day_of', 'after_expiry'),
        allowNull: false,
        comment: 'Type of reminder this template is for'
      },
      subject: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Email subject template (supports variables like {{quoteNumber}})'
      },
      body: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Email body template (supports variables and HTML)'
      },
      notification_title: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'In-app notification title template'
      },
      notification_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'In-app notification message template'
      },
      create_task: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether to create a task when this reminder is sent'
      },
      task_title_template: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Task title template if create_task is true'
      },
      task_priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
        allowNull: true,
        defaultValue: 'medium',
        comment: 'Priority for auto-created tasks'
      },
      is_default: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether this is the default template for this reminder type'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether this template is currently active'
      },
      team_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'teams',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Team this template belongs to (null for global)'
      },
      institution_type: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Specific institution type this template is for (e.g., "Clinique", "Hôpital")'
      },
      min_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Minimum quote amount to use this template'
      },
      max_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Maximum quote amount to use this template'
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Indexes for performance
    await queryInterface.addIndex('reminder_templates', ['reminder_type']);
    await queryInterface.addIndex('reminder_templates', ['is_active']);
    await queryInterface.addIndex('reminder_templates', ['is_default']);
    await queryInterface.addIndex('reminder_templates', ['team_id']);
    await queryInterface.addIndex('reminder_templates', ['institution_type']);

    // Insert default templates
    await queryInterface.bulkInsert('reminder_templates', [
      {
        id: Sequelize.literal('gen_random_uuid()'),
        name: '7 jours avant échéance',
        reminder_type: '7_days_before',
        subject: 'Rappel : Devis {{quoteNumber}} expire dans 7 jours',
        body: `<p>Bonjour,</p>
<p>Nous souhaitons vous rappeler que votre devis <strong>{{quoteNumber}}</strong> expire le <strong>{{validUntil}}</strong>, soit dans 7 jours.</p>
<p><strong>Détails du devis :</strong></p>
<ul>
  <li>Titre : {{title}}</li>
  <li>Montant total : {{total}} €</li>
  <li>Date d'expiration : {{validUntil}}</li>
</ul>
<p>N'hésitez pas à nous contacter si vous avez des questions ou si vous souhaitez procéder à la commande.</p>
<p>Cordialement,<br>L'équipe {{companyName}}</p>`,
        notification_title: 'Devis expire bientôt',
        notification_message: 'Le devis {{quoteNumber}} expire dans 7 jours',
        create_task: true,
        task_title_template: 'Relancer le client pour le devis {{quoteNumber}}',
        task_priority: 'medium',
        is_default: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: Sequelize.literal('gen_random_uuid()'),
        name: '3 jours avant échéance',
        reminder_type: '3_days_before',
        subject: 'URGENT : Devis {{quoteNumber}} expire dans 3 jours',
        body: `<p>Bonjour,</p>
<p><strong>Attention :</strong> Votre devis <strong>{{quoteNumber}}</strong> expire le <strong>{{validUntil}}</strong>, soit dans seulement 3 jours.</p>
<p><strong>Détails du devis :</strong></p>
<ul>
  <li>Titre : {{title}}</li>
  <li>Montant total : {{total}} €</li>
  <li>Date d'expiration : {{validUntil}}</li>
</ul>
<p>Pour garantir les conditions proposées, nous vous encourageons à passer commande rapidement.</p>
<p>Cordialement,<br>L'équipe {{companyName}}</p>`,
        notification_title: 'Devis expire très bientôt',
        notification_message: 'Le devis {{quoteNumber}} expire dans 3 jours - Action requise',
        create_task: true,
        task_title_template: 'URGENT : Relancer le client pour le devis {{quoteNumber}}',
        task_priority: 'high',
        is_default: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: Sequelize.literal('gen_random_uuid()'),
        name: 'Jour J - Échéance aujourd\'hui',
        reminder_type: 'day_of',
        subject: 'DERNIER JOUR : Devis {{quoteNumber}} expire aujourd\'hui',
        body: `<p>Bonjour,</p>
<p><strong>C'est le dernier jour !</strong> Votre devis <strong>{{quoteNumber}}</strong> expire aujourd'hui (<strong>{{validUntil}}</strong>).</p>
<p><strong>Détails du devis :</strong></p>
<ul>
  <li>Titre : {{title}}</li>
  <li>Montant total : {{total}} €</li>
</ul>
<p>Si vous souhaitez procéder à la commande ou prolonger la validité du devis, merci de nous contacter rapidement.</p>
<p>Cordialement,<br>L'équipe {{companyName}}</p>`,
        notification_title: 'Devis expire AUJOURD\'HUI',
        notification_message: 'Le devis {{quoteNumber}} expire aujourd\'hui - Dernière chance',
        create_task: true,
        task_title_template: 'CRITIQUE : Devis {{quoteNumber}} expire aujourd\'hui',
        task_priority: 'urgent',
        is_default: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: Sequelize.literal('gen_random_uuid()'),
        name: 'Après échéance',
        reminder_type: 'after_expiry',
        subject: 'Devis {{quoteNumber}} expiré - Proposition de renouvellement',
        body: `<p>Bonjour,</p>
<p>Votre devis <strong>{{quoteNumber}}</strong> a expiré le <strong>{{validUntil}}</strong>.</p>
<p>Nous restons à votre disposition pour :</p>
<ul>
  <li>Établir un nouveau devis avec des conditions actualisées</li>
  <li>Prolonger la validité du devis actuel</li>
  <li>Répondre à vos questions sur notre offre</li>
</ul>
<p>N'hésitez pas à nous contacter.</p>
<p>Cordialement,<br>L'équipe {{companyName}}</p>`,
        notification_title: 'Devis expiré',
        notification_message: 'Le devis {{quoteNumber}} a expiré - Proposition de renouvellement',
        create_task: true,
        task_title_template: 'Proposer une extension ou nouveau devis pour {{quoteNumber}}',
        task_priority: 'medium',
        is_default: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('reminder_templates');
  }
};
