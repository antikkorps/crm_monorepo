<template>
  <div class="template-preview">
    <div class="document">
      <!-- Header with company name and logo -->
      <div class="header">
        <div v-if="templateData.logoUrl" class="header-logo" :class="logoSizeClass">
          <img :src="templateData.logoUrl" :alt="templateData.companyName + ' logo'" />
        </div>
        <div class="header-content">
          <h1>{{ templateData.companyName }}</h1>
          <div class="header-subtitle">{{ templateData.name }}</div>
        </div>
      </div>

      <!-- Document info - left aligned -->
      <div class="document-meta">
        <div class="document-type">{{ documentTypeLabel }}</div>
        <div class="document-details">
          <p><strong>N° :</strong> {{ documentNumberExample }}</p>
          <p><strong>Date :</strong> {{ currentDate }}</p>
          <p v-if="templateData.type !== 'invoice'"><strong>Valide jusqu'au :</strong> {{ validUntilDate }}</p>
          <p v-else><strong>Échéance :</strong> {{ dueDate }}</p>
        </div>
      </div>

      <!-- Two columns: Émetteur and Destinataire using table for consistency with PDF -->
      <table class="parties-table">
        <tr>
          <td class="party">
            <h3>Émetteur</h3>
            <p class="party-name">{{ templateData.companyName }}</p>
            <p>{{ templateData.companyAddress.street }}</p>
            <p>{{ templateData.companyAddress.zipCode }} {{ templateData.companyAddress.city }}</p>
            <p>{{ templateData.companyAddress.country }}</p>
            <p v-if="templateData.companyPhone">Tél : {{ templateData.companyPhone }}</p>
            <p v-if="templateData.companyEmail">Email : {{ templateData.companyEmail }}</p>
            <p v-if="templateData.siretNumber">SIRET : {{ templateData.siretNumber }}</p>
            <p v-if="templateData.taxNumber">TVA : {{ templateData.taxNumber }}</p>
          </td>
          <td class="party">
            <h3>{{ clientSectionLabel }}</h3>
            <p class="party-name">Établissement Médical Exemple</p>
            <p>123 Avenue de la Santé</p>
            <p>75001 Paris</p>
            <p>France</p>
            <p>Tél : +33 1 23 45 67 89</p>
            <p>Email : contact@hopital-exemple.fr</p>
          </td>
        </tr>
      </table>

      <!-- Custom header message if any -->
      <div v-if="templateData.customHeader" class="custom-message">
        {{ templateData.customHeader }}
      </div>

      <!-- Items table -->
      <table class="items-table">
        <thead>
          <tr>
            <th class="col-description">Description</th>
            <th class="col-qty">Qté</th>
            <th class="col-price">Prix unitaire</th>
            <th class="col-discount">Remise</th>
            <th class="col-tax">TVA</th>
            <th class="col-total">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Équipement médical spécialisé</td>
            <td class="text-center">2</td>
            <td class="text-right">1 250,00 €</td>
            <td class="text-right">0,00 €</td>
            <td class="text-right">500,00 €</td>
            <td class="text-right">3 000,00 €</td>
          </tr>
          <tr>
            <td>Formation du personnel (8h)</td>
            <td class="text-center">1</td>
            <td class="text-right">800,00 €</td>
            <td class="text-right">80,00 €</td>
            <td class="text-right">144,00 €</td>
            <td class="text-right">864,00 €</td>
          </tr>
          <tr>
            <td>Maintenance annuelle</td>
            <td class="text-center">1</td>
            <td class="text-right">450,00 €</td>
            <td class="text-right">0,00 €</td>
            <td class="text-right">90,00 €</td>
            <td class="text-right">540,00 €</td>
          </tr>
        </tbody>
      </table>

      <!-- Totals section -->
      <div class="totals-section">
        <div class="total-row">
          <span>Sous-total HT</span>
          <span>2 500,00 €</span>
        </div>
        <div class="total-row">
          <span>Remise totale</span>
          <span>-80,00 €</span>
        </div>
        <div class="total-row">
          <span>TVA</span>
          <span>734,00 €</span>
        </div>
        <div class="total-row total-final">
          <span>Total TTC</span>
          <span>4 404,00 €</span>
        </div>
      </div>

      <!-- Terms and payment info -->
      <div class="footer-info">
        <div v-if="templateData.termsAndConditions" class="footer-block">
          <h4>Conditions générales</h4>
          <p>{{ templateData.termsAndConditions }}</p>
        </div>
        <div v-else class="footer-block">
          <h4>Conditions générales</h4>
          <p>Paiement à 30 jours fin de mois. Matériel garanti 2 ans pièces et main d'œuvre.</p>
        </div>

        <div v-if="templateData.paymentInstructions" class="footer-block">
          <h4>Modalités de paiement</h4>
          <p>{{ templateData.paymentInstructions }}</p>
        </div>
        <div v-else class="footer-block">
          <h4>Modalités de paiement</h4>
          <p>Virement bancaire : IBAN FR76 1234 5678 9012 3456 7890 123</p>
        </div>
      </div>

      <!-- Document footer -->
      <div class="document-footer">
        {{ templateData.customFooter || `${templateData.companyName} - Document généré le ${currentDate}` }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DocumentTemplateCreateRequest } from "@medical-crm/shared"
import { computed } from "vue"

interface Props {
  templateData: DocumentTemplateCreateRequest
}

const props = defineProps<Props>()

const currentDate = new Date().toLocaleDateString("fr-FR")

const validUntilDate = computed(() => {
  const date = new Date()
  date.setDate(date.getDate() + 30)
  return date.toLocaleDateString("fr-FR")
})

const dueDate = computed(() => {
  const date = new Date()
  date.setDate(date.getDate() + 30)
  return date.toLocaleDateString("fr-FR")
})

const documentTypeLabel = computed(() => {
  switch (props.templateData.type) {
    case "quote":
      return "DEVIS"
    case "invoice":
      return "FACTURE"
    default:
      return "DEVIS / FACTURE"
  }
})

const documentNumberExample = computed(() => {
  switch (props.templateData.type) {
    case "quote":
      return "DEV-2025-0001"
    case "invoice":
      return "FAC-2025-0001"
    default:
      return "DOC-2025-0001"
  }
})

const clientSectionLabel = computed(() => {
  return props.templateData.type === "invoice" ? "Facturé à" : "Destinataire"
})

const logoSizeClass = computed(() => {
  const size = props.templateData.logoSize || "medium"
  return `logo-${size}`
})
</script>

<style scoped>
.template-preview {
  width: 100%;
  height: 700px;
  overflow-y: auto;
  background: white;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 13px;
  line-height: 1.5;
  color: #333;
}

.document {
  max-width: 800px;
  margin: 0 auto;
  padding: 30px;
}

/* Header */
.header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding-bottom: 20px;
  border-bottom: 3px solid v-bind('templateData.primaryColor || "#3f51b5"');
  margin-bottom: 25px;
}

.header-logo {
  flex-shrink: 0;
}

.header-logo.logo-small img {
  max-height: 40px;
  max-width: 80px;
}

.header-logo.logo-medium img {
  max-height: 60px;
  max-width: 120px;
}

.header-logo.logo-large img {
  max-height: 80px;
  max-width: 160px;
}

.header-logo img {
  object-fit: contain;
}

.header-content h1 {
  font-size: 1.8rem;
  font-weight: 700;
  color: v-bind('templateData.primaryColor || "#3f51b5"');
  margin: 0;
}

.header-subtitle {
  color: #666;
  font-size: 0.9rem;
  margin-top: 4px;
}

/* Document meta info */
.document-meta {
  margin-bottom: 30px;
}

.document-type {
  font-size: 1.5rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 10px;
}

.document-details p {
  margin: 4px 0;
  color: #555;
}

/* Parties table for two-column layout */
.parties-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 30px;
}

.parties-table td.party {
  width: 50%;
  vertical-align: top;
  padding-right: 30px;
}

.parties-table td.party:last-child {
  padding-right: 0;
  padding-left: 30px;
}

.party h3 {
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  color: #888;
  margin: 0 0 10px 0;
  letter-spacing: 0.5px;
}

.party-name {
  font-weight: 600;
  color: #333;
  margin-bottom: 5px;
}

.party p {
  margin: 3px 0;
  color: #555;
}

/* Custom message */
.custom-message {
  background: #fff8e1;
  border-left: 3px solid #ffc107;
  padding: 12px 15px;
  margin-bottom: 25px;
  color: #856404;
}

/* Items table */
.items-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

.items-table th {
  background: v-bind('templateData.primaryColor || "#3f51b5"');
  color: white;
  padding: 12px 10px;
  text-align: left;
  font-weight: 600;
  font-size: 0.85rem;
}

.items-table th.col-qty,
.items-table th.col-price,
.items-table th.col-discount,
.items-table th.col-tax,
.items-table th.col-total {
  text-align: right;
  width: 100px;
}

.items-table th.col-qty {
  text-align: center;
  width: 60px;
}

.items-table td {
  padding: 12px 10px;
  border-bottom: 1px solid #eee;
  vertical-align: top;
}

.items-table tbody tr:hover {
  background: #fafafa;
}

.text-center {
  text-align: center;
}

.text-right {
  text-align: right;
}

/* Totals section */
.totals-section {
  width: 280px;
  margin-left: auto;
  margin-bottom: 30px;
}

.total-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.total-final {
  font-weight: 700;
  font-size: 1.1rem;
  color: v-bind('templateData.primaryColor || "#3f51b5"');
  border-bottom: 2px solid v-bind('templateData.primaryColor || "#3f51b5"');
  border-top: 1px solid #ccc;
  margin-top: 5px;
  padding-top: 10px;
}

/* Footer info */
.footer-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  margin-bottom: 30px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.footer-block h4 {
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  color: #888;
  margin: 0 0 8px 0;
  letter-spacing: 0.5px;
}

.footer-block p {
  margin: 0;
  color: #555;
  font-size: 0.9rem;
  line-height: 1.6;
}

/* Document footer */
.document-footer {
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid #eee;
  color: #888;
  font-size: 0.85rem;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .document {
    padding: 20px;
  }

  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .header-content h1 {
    font-size: 1.5rem;
  }

  /* Stack parties table vertically on mobile */
  .parties-table,
  .parties-table tbody,
  .parties-table tr {
    display: block;
  }

  .parties-table td.party {
    display: block;
    width: 100%;
    padding: 0 0 20px 0;
  }

  .parties-table td.party:last-child {
    padding-left: 0;
    padding-bottom: 0;
  }

  .footer-info {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .items-table {
    font-size: 0.85rem;
  }

  .items-table th,
  .items-table td {
    padding: 8px 6px;
  }

  /* Hide some columns on mobile */
  .items-table th.col-discount,
  .items-table td:nth-child(4),
  .items-table th.col-tax,
  .items-table td:nth-child(5) {
    display: none;
  }

  .totals-section {
    width: 100%;
  }
}
</style>
