"use strict"

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("cgv_templates", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      description: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: "JSON ProseMirror content",
      },
      category: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: "Optional category: audit, formation, conseil, general",
      },
      is_default: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      order_index: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    })

    // Add index for active templates
    await queryInterface.addIndex("cgv_templates", ["is_active", "order_index"], {
      name: "cgv_templates_active_order_idx",
    })

    // Insert default templates
    const defaultTemplates = [
      {
        id: Sequelize.literal("gen_random_uuid()"),
        name: "CGV Standard",
        description: "Conditions générales standard pour missions de conseil",
        category: "general",
        is_default: true,
        is_active: true,
        order_index: 1,
        content: JSON.stringify({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", marks: [{ type: "bold" }], text: "1. Objet" },
              ],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "La présente lettre de mission définit les conditions dans lesquelles le prestataire s'engage à réaliser la mission décrite ci-dessus pour le compte du client.",
                },
              ],
            },
            {
              type: "paragraph",
              content: [
                { type: "text", marks: [{ type: "bold" }], text: "2. Durée et calendrier" },
              ],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "La mission débutera à la date convenue et se déroulera selon le planning établi. Toute modification du calendrier fera l'objet d'un accord préalable entre les parties.",
                },
              ],
            },
            {
              type: "paragraph",
              content: [
                { type: "text", marks: [{ type: "bold" }], text: "3. Honoraires et facturation" },
              ],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Les honoraires sont calculés selon les modalités définies dans la présente lettre. La facturation sera établie mensuellement ou à l'issue de la mission selon accord. Les factures sont payables à 30 jours.",
                },
              ],
            },
            {
              type: "paragraph",
              content: [
                { type: "text", marks: [{ type: "bold" }], text: "4. Confidentialité" },
              ],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Le prestataire s'engage à traiter de manière confidentielle toutes les informations portées à sa connaissance dans le cadre de la mission.",
                },
              ],
            },
            {
              type: "paragraph",
              content: [
                { type: "text", marks: [{ type: "bold" }], text: "5. Responsabilité" },
              ],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Le prestataire s'engage à exécuter sa mission avec diligence et compétence. Sa responsabilité est limitée au montant des honoraires perçus pour la mission concernée.",
                },
              ],
            },
          ],
        }),
      },
      {
        id: Sequelize.literal("gen_random_uuid()"),
        name: "CGV Mission d'Audit",
        description: "Conditions spécifiques aux missions d'audit",
        category: "audit",
        is_default: false,
        is_active: true,
        order_index: 2,
        content: JSON.stringify({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", marks: [{ type: "bold" }], text: "1. Nature de la mission" },
              ],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "La mission d'audit sera conduite conformément aux normes d'exercice professionnel applicables. Elle comprend l'examen des procédures, le contrôle des comptes et la formulation de recommandations.",
                },
              ],
            },
            {
              type: "paragraph",
              content: [
                { type: "text", marks: [{ type: "bold" }], text: "2. Obligations du client" },
              ],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Le client s'engage à mettre à disposition tous les documents et informations nécessaires à la réalisation de la mission, et à faciliter l'accès aux personnes concernées.",
                },
              ],
            },
            {
              type: "paragraph",
              content: [
                { type: "text", marks: [{ type: "bold" }], text: "3. Livrables" },
              ],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "À l'issue de la mission, un rapport d'audit sera remis au client, comprenant les constatations, conclusions et recommandations.",
                },
              ],
            },
            {
              type: "paragraph",
              content: [
                { type: "text", marks: [{ type: "bold" }], text: "4. Confidentialité et secret professionnel" },
              ],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "L'auditeur est tenu au secret professionnel. Les informations recueillies ne seront utilisées que dans le cadre strict de la mission.",
                },
              ],
            },
            {
              type: "paragraph",
              content: [
                { type: "text", marks: [{ type: "bold" }], text: "5. Indépendance" },
              ],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "L'auditeur déclare n'avoir aucun lien susceptible de porter atteinte à son indépendance vis-à-vis du client.",
                },
              ],
            },
          ],
        }),
      },
      {
        id: Sequelize.literal("gen_random_uuid()"),
        name: "CGV Formation",
        description: "Conditions générales pour les prestations de formation",
        category: "formation",
        is_default: false,
        is_active: true,
        order_index: 3,
        content: JSON.stringify({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", marks: [{ type: "bold" }], text: "1. Organisation de la formation" },
              ],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "La formation se déroulera aux dates et lieu convenus. Le programme détaillé sera communiqué avant le début de la formation.",
                },
              ],
            },
            {
              type: "paragraph",
              content: [
                { type: "text", marks: [{ type: "bold" }], text: "2. Participants" },
              ],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Le client s'engage à communiquer la liste définitive des participants au moins 5 jours ouvrés avant la formation. Le nombre de participants est limité selon les conditions convenues.",
                },
              ],
            },
            {
              type: "paragraph",
              content: [
                { type: "text", marks: [{ type: "bold" }], text: "3. Annulation et report" },
              ],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Toute annulation doit être signalée par écrit. En cas d'annulation moins de 10 jours ouvrés avant la date prévue, 50% des honoraires restent dus. Moins de 5 jours, la totalité est due.",
                },
              ],
            },
            {
              type: "paragraph",
              content: [
                { type: "text", marks: [{ type: "bold" }], text: "4. Supports pédagogiques" },
              ],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Les supports de formation remis aux participants restent la propriété intellectuelle du formateur et ne peuvent être reproduits sans autorisation.",
                },
              ],
            },
            {
              type: "paragraph",
              content: [
                { type: "text", marks: [{ type: "bold" }], text: "5. Attestation de formation" },
              ],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Une attestation de présence et/ou de formation sera délivrée à chaque participant à l'issue de la formation.",
                },
              ],
            },
          ],
        }),
      },
    ]

    // Insert templates one by one to handle UUID generation
    for (const template of defaultTemplates) {
      await queryInterface.sequelize.query(`
        INSERT INTO cgv_templates (id, name, description, category, is_default, is_active, order_index, content, created_at, updated_at)
        VALUES (gen_random_uuid(), :name, :description, :category, :is_default, :is_active, :order_index, :content, NOW(), NOW())
      `, {
        replacements: {
          name: template.name,
          description: template.description,
          category: template.category,
          is_default: template.is_default,
          is_active: template.is_active,
          order_index: template.order_index,
          content: template.content,
        },
      })
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("cgv_templates")
  },
}
