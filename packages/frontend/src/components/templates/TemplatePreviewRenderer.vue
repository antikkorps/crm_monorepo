<template>
  <div class="template-preview">
    <div class="document">
      <!-- Logo positioned at top of document -->
      <div v-if="isTopLogoPosition && templateData.logoUrl" class="top-logo-container" :class="logoPositionClass">
        <div class="company-logo" :class="logoSizeClass">
          <img :src="templateData.logoUrl" :alt="templateData.companyName + ' logo'" />
        </div>
      </div>

      <div class="header" :class="logoPositionClass">
        <div class="company-section">
          <div v-if="templateData.logoUrl && templateData.logoPosition === 'header_left'" class="company-logo" :class="logoSizeClass">
            <img :src="templateData.logoUrl" :alt="templateData.companyName + ' logo'" />
          </div>
          <div class="company-text">
            <h1>{{ templateData.companyName }}</h1>
            <div class="template-name">{{ templateData.name }}</div>
          </div>
        </div>
        <div class="document-info">
          <h2>{{ documentTypeLabel }}</h2>
          <p>Date: {{ currentDate }}</p>
        </div>
        <div v-if="templateData.logoUrl && templateData.logoPosition === 'header_right'" class="header-logo-right" :class="logoSizeClass">
          <img :src="templateData.logoUrl" :alt="templateData.companyName + ' logo'" />
        </div>
      </div>

      <div class="company-details">
        <div class="company-info">
          <h3>Émetteur</h3>
          <p><strong>{{ templateData.companyName }}</strong></p>
          <p>{{ templateData.companyAddress.street }}</p>
          <p>{{ templateData.companyAddress.city }}, {{ templateData.companyAddress.state }} {{ templateData.companyAddress.zipCode }}</p>
          <p>{{ templateData.companyAddress.country }}</p>
          <p v-if="templateData.companyEmail">📧 {{ templateData.companyEmail }}</p>
          <p v-if="templateData.companyPhone">📞 {{ templateData.companyPhone }}</p>
          <p v-if="templateData.companyWebsite">🌐 {{ templateData.companyWebsite }}</p>
          <p v-if="templateData.taxNumber">TVA: {{ templateData.taxNumber }}</p>
          <p v-if="templateData.siretNumber">SIRET: {{ templateData.siretNumber }}</p>
        </div>

        <div class="client-info">
          <h3>{{ clientSectionLabel }}</h3>
          <p><strong>Établissement Médical</strong></p>
          <p>123 Avenue de la Santé</p>
          <p>75001 Paris, France</p>
          <p>📧 contact@hopital-exemple.fr</p>
          <p>📞 +33 1 23 45 67 89</p>
        </div>
      </div>

      <div class="content">
        <div v-if="templateData.customHeader" class="custom-header">
          <strong>Information importante:</strong> {{ templateData.customHeader }}
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Quantité</th>
              <th>Prix unitaire</th>
              <th>Total HT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-label="Description">
                <strong>Équipement médical spécialisé</strong>
                <br><small>Référence: EMS-2024-001</small>
              </td>
              <td data-label="Quantité">2</td>
              <td data-label="Prix unitaire">1 250,00 €</td>
              <td data-label="Total HT">2 500,00 €</td>
            </tr>
            <tr>
              <td data-label="Description">
                <strong>Formation du personnel</strong>
                <br><small>Formation certifiante 8 heures</small>
              </td>
              <td data-label="Quantité">1</td>
              <td data-label="Prix unitaire">800,00 €</td>
              <td data-label="Total HT">800,00 €</td>
            </tr>
            <tr>
              <td data-label="Description">
                <strong>Maintenance annuelle</strong>
                <br><small>Contrat de maintenance préventive</small>
              </td>
              <td data-label="Quantité">1</td>
              <td data-label="Prix unitaire">450,00 €</td>
              <td data-label="Total HT">450,00 €</td>
            </tr>
          </tbody>
        </table>

        <div class="total-section">
          <div class="total-line">
            <span>Sous-total HT:</span>
            <span>3 750,00 €</span>
          </div>
          <div class="total-line">
            <span>TVA (20%):</span>
            <span>750,00 €</span>
          </div>
          <div class="total-line total-final">
            <span><strong>Total TTC:</strong></span>
            <span><strong>4 500,00 €</strong></span>
          </div>
        </div>
      </div>

      <div class="footer-sections">
        <div v-if="templateData.termsAndConditions" class="footer-section">
          <h4>Conditions générales</h4>
          <p>{{ templateData.termsAndConditions }}</p>
        </div>
        <div v-else class="footer-section">
          <h4>Conditions générales</h4>
          <p>• Paiement à 30 jours fin de mois<br>
          • Matériel garanti 2 ans pièces et main d'œuvre<br>
          • Formation incluse dans le prix<br>
          • Livraison et installation comprises</p>
        </div>

        <div v-if="templateData.paymentInstructions" class="footer-section">
          <h4>Modalités de paiement</h4>
          <p>{{ templateData.paymentInstructions }}</p>
        </div>
        <div v-else class="footer-section">
          <h4>Modalités de paiement</h4>
          <p>Virement bancaire - IBAN: FR76 1234 5678 9012 3456 7890 123<br>
          Chèque à l'ordre de {{ templateData.companyName }}</p>
        </div>
      </div>

      <div class="footer">
        {{ templateData.customFooter || `${templateData.companyName} - Spécialiste en équipements médicaux depuis 1995` }}
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

const documentTypeLabel = computed(() => {
  switch (props.templateData.type) {
    case "quote":
      return "DEVIS"
    case "invoice":
      return "FACTURE"
    default:
      return "DOCUMENT"
  }
})

const clientSectionLabel = computed(() => {
  return props.templateData.type === "invoice" ? "Facturé à" : "Destinataire"
})

const logoSizeClass = computed(() => {
  const size = props.templateData.logoSize || "medium"
  return `logo-${size}`
})

const logoPositionClass = computed(() => {
  const position = props.templateData.logoPosition || "header_left"
  return `logo-position-${position.replace('_', '-')}`
})

const isTopLogoPosition = computed(() => {
  const position = props.templateData.logoPosition || "header_left"
  return position.startsWith('top_')
})

const isHeaderLogoPosition = computed(() => {
  const position = props.templateData.logoPosition || "header_left"
  return position.startsWith('header_')
})
</script>

<style scoped>
.template-preview {
  width: 100%;
  height: 700px;
  overflow-y: auto;
  background: white;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
  color: #2c3e50;
}

.document {
  max-width: 800px;
  margin: 0 auto;
  background: white;
  padding: 20px;
}

/* Top logo container styles */
.top-logo-container {
  padding: 20px;
  margin-bottom: 10px;
  display: flex;
  width: 100%;
}

.top-logo-container.logo-position-top-left {
  justify-content: flex-start;
}

.top-logo-container.logo-position-top-center {
  justify-content: center;
}

.top-logo-container.logo-position-top-right {
  justify-content: flex-end;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30px 20px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-left: 4px solid v-bind('templateData.primaryColor || "#3f51b5"');
  color: #2c3e50;
  margin-bottom: 30px;
  border-radius: 8px;
}

.company-section {
  display: flex;
  align-items: center;
  gap: 20px;
  flex: 1;
}

.header-logo-right {
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  padding: 8px;
  flex-shrink: 0;
  margin-left: 20px;
}

.header-logo-right img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.company-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  padding: 8px;
  flex-shrink: 0;
}

/* Logo size classes */
.company-logo.logo-small,
.header-logo-right.logo-small {
  width: 60px;
  height: 60px;
}

.company-logo.logo-medium,
.header-logo-right.logo-medium {
  width: 80px;
  height: 80px;
}

.company-logo.logo-large,
.header-logo-right.logo-large {
  width: 120px;
  height: 120px;
}

.company-logo img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.company-text {
  flex: 1;
}


.header h1 {
  font-size: 2.2rem;
  font-weight: 700;
  margin-bottom: 5px;
  color: v-bind('templateData.primaryColor || "#3f51b5"');
}

.template-name {
  opacity: 0.7;
  font-size: 1rem;
  color: #6c757d;
}

.header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 5px;
}

.document-info {
  text-align: right;
}

.company-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  margin-bottom: 30px;
  padding: 0 20px;
}

.company-info, .client-info {
  background: #f8f9fa;
  padding: 25px;
  border-radius: 12px;
  border-left: 4px solid v-bind('templateData.primaryColor || "#3f51b5"');
}

.company-info h3, .client-info h3 {
  color: v-bind('templateData.primaryColor || "#3f51b5"');
  margin-bottom: 15px;
  font-size: 1.2rem;
  font-weight: 600;
}

.company-info p, .client-info p {
  margin-bottom: 8px;
  color: #5a6c7d;
}

.content {
  padding: 0 20px;
  margin-bottom: 40px;
}

.custom-header {
  background: #e3f2fd;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  border-left: 4px solid v-bind('templateData.primaryColor || "#3f51b5"');
}

.items-table {
  width: 100%;
  border-collapse: collapse;
  margin: 30px 0;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.items-table th {
  background: v-bind('templateData.primaryColor || "#3f51b5"');
  color: white;
  padding: 15px;
  text-align: left;
  font-weight: 600;
}

.items-table td {
  padding: 15px;
  border-bottom: 1px solid #eee;
}

.items-table tr:hover {
  background: #f8f9fa;
}

.total-section {
  text-align: right;
  margin: 30px 0;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.total-line {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  padding: 5px 0;
}

.total-final {
  font-size: 1.2rem;
  font-weight: 700;
  color: v-bind('templateData.primaryColor || "#3f51b5"');
  border-top: 2px solid v-bind('templateData.primaryColor || "#3f51b5"');
  padding-top: 10px;
}

.footer-sections {
  margin-top: 40px;
  padding: 0 20px;
}

.footer-section {
  background: #f8f9fa;
  padding: 20px;
  margin-bottom: 20px;
  border-radius: 8px;
  border-left: 4px solid v-bind('templateData.secondaryColor || "#2196f3"');
}

.footer-section h4 {
  color: v-bind('templateData.secondaryColor || "#2196f3"');
  margin-bottom: 10px;
  font-size: 1.1rem;
}

.footer {
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
  color: #6c757d;
  text-align: center;
  padding: 20px;
  margin-top: 40px;
  font-size: 0.9rem;
  border-radius: 8px;
}

/* Improved mobile responsiveness */
@media (max-width: 768px) {
  .document {
    padding: 15px;
  }

  /* Top logo adjustments for mobile */
  .top-logo-container {
    padding: 15px;
    text-align: center !important;
  }

  .top-logo-container .company-logo {
    width: 60px !important;
    height: 60px !important;
  }

  /* Header mobile layout */
  .header {
    flex-direction: column;
    text-align: center;
    gap: 15px;
    padding: 20px 15px;
  }

  .company-section {
    flex-direction: column;
    text-align: center;
    gap: 15px;
  }

  .company-section .company-logo {
    width: 70px !important;
    height: 70px !important;
  }

  .header-logo-right {
    margin-left: 0;
    align-self: center;
  }

  .document-info {
    text-align: center;
  }

  .header h1 {
    font-size: 1.8rem;
  }

  .header h2 {
    font-size: 1.3rem;
  }

  /* Company details mobile layout */
  .company-details {
    grid-template-columns: 1fr;
    gap: 15px;
    padding: 0 10px;
  }

  .company-info, .client-info {
    padding: 20px;
  }

  /* Mobile-friendly table */
  .items-table {
    font-size: 0.85rem;
  }

  .items-table th,
  .items-table td {
    padding: 10px 8px;
  }

  .items-table th {
    font-size: 0.8rem;
  }

  /* Hide some columns on very small screens */
  .items-table th:nth-child(2),
  .items-table td:nth-child(2) {
    display: none;
  }

  /* Content padding */
  .content {
    padding: 0 10px;
  }

  /* Total section mobile */
  .total-section {
    padding: 15px;
    margin: 20px 0;
  }

  .total-line {
    font-size: 0.9rem;
  }

  .total-final {
    font-size: 1.1rem;
  }

  /* Footer sections */
  .footer-sections {
    padding: 0 10px;
  }

  .footer-section {
    padding: 15px;
  }

  .footer-section h4 {
    font-size: 1rem;
  }

  .footer {
    padding: 15px;
    font-size: 0.85rem;
  }
}

/* Extra small screens (phones) */
@media (max-width: 480px) {
  .document {
    padding: 10px;
  }

  .header {
    padding: 15px 10px;
  }

  .header h1 {
    font-size: 1.5rem;
  }

  .header h2 {
    font-size: 1.2rem;
  }

  /* Convert table to card layout on very small screens */
  .items-table {
    display: block;
    border: none;
    box-shadow: none;
  }

  .items-table thead {
    display: none;
  }

  .items-table tbody {
    display: block;
  }

  .items-table tr {
    display: block;
    background: white;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    margin-bottom: 15px;
    padding: 15px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  }

  .items-table td {
    display: block;
    padding: 5px 0;
    border: none;
    text-align: left !important;
  }

  .items-table td:before {
    content: attr(data-label) ': ';
    font-weight: 600;
    color: v-bind('templateData.primaryColor || "#3f51b5"');
  }

  .items-table td:first-child {
    font-weight: 600;
    font-size: 1rem;
    margin-bottom: 8px;
  }

  .items-table td:first-child:before {
    display: none;
  }

  /* Adjust total section for very small screens */
  .total-section {
    padding: 12px;
  }

  .company-info, .client-info {
    padding: 15px;
  }

  .footer-section {
    padding: 12px;
  }
}
</style>