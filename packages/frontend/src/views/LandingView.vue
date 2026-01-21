<template>
  <v-app>
    <v-main>
      <!-- Hero Section -->
      <v-container fluid class="hero-section">
        <v-row
          align="center"
          justify="center"
          class="fill-height text-center text-md-left"
        >
          <v-col cols="12" md="6">
            <div class="hero-content">
              <h1 class="hero-title">
                OPEx_CRM
                <span class="hero-highlight"
                  >L'excellence opérationnelle pour vos blocs opératoires</span
                >
              </h1>
              <p class="hero-description">
                Gérez efficacement vos relations avec les institutions médicales, suivez
                vos tâches et optimisez votre workflow commercial dans le secteur médical.
              </p>
              <div class="hero-actions">
                <v-btn
                  color="amber-accent-3"
                  size="x-large"
                  prepend-icon="mdi-login"
                  variant="elevated"
                  @click="goToLogin"
                  class="mr-4"
                  data-testid="login-button"
                >
                  Se connecter
                </v-btn>
                <v-btn
                  color="white"
                  size="x-large"
                  prepend-icon="mdi-arrow-down"
                  variant="outlined"
                  @click="scrollToFeatures"
                  data-testid="learn-more-button"
                >
                  En savoir plus
                </v-btn>
              </div>
            </div>
          </v-col>
          <v-col cols="12" md="6" class="d-flex align-center justify-center">
            <div class="hero-image-container">
              <v-card class="mockup-card" elevation="8">
                <v-card-item>
                  <v-card-title class="d-flex align-center text-body-2">
                    <v-icon color="light-blue-accent-3" start icon="mdi-chart-bar" />
                    <span>Performance</span>
                  </v-card-title>
                </v-card-item>
                <v-card-text class="pa-0 px-4 pb-4">
                  <div class="mini-chart">
                    <div class="mini-chart-bar" style="height: 12%"></div>
                    <div class="mini-chart-bar" style="height: 50%"></div>
                    <div class="mini-chart-bar" style="height: 25%"></div>
                    <div class="mini-chart-bar" style="height: 100%"></div>
                    <div class="mini-chart-bar" style="height: 62%"></div>
                    <div class="mini-chart-bar" style="height: 87%"></div>
                  </div>
                </v-card-text>
              </v-card>
              <v-card class="mockup-card-2" elevation="16">
                <v-card-item>
                  <v-card-title class="d-flex align-center text-body-2">
                    <v-icon color="green-accent-3" start icon="mdi-account-group" />
                    <span>Nouveaux Contacts</span>
                  </v-card-title>
                </v-card-item>
                <v-card-text>
                  <div class="d-flex justify-space-around">
                    <v-avatar color="rgba(255,255,255,0.3)" size="40">
                      <v-icon>mdi-account</v-icon>
                    </v-avatar>
                    <v-avatar color="rgba(255,255,255,0.3)" size="40">
                      <v-icon>mdi-account</v-icon>
                    </v-avatar>
                    <v-avatar color="rgba(255,255,255,0.3)" size="40">
                      <v-icon>mdi-account</v-icon>
                    </v-avatar>
                  </div>
                </v-card-text>
              </v-card>
              <v-card class="mockup-card-3" elevation="12">
                <v-card-item>
                  <v-card-title class="d-flex align-center text-body-2">
                    <v-icon color="amber-accent-3" start icon="mdi-check-all" />
                    <span>Tâches</span>
                  </v-card-title>
                </v-card-item>
                <v-card-text>
                  <div class="d-flex align-center mb-2">
                    <v-checkbox-btn
                      :model-value="true"
                      readonly
                      color="amber-accent-3"
                      class="mr-2"
                    />
                    <span class="text-decoration-line-through"
                      >Rendez-vous Dr. Martin</span
                    >
                  </div>
                  <div class="d-flex align-center">
                    <v-checkbox-btn :model-value="false" readonly class="mr-2" />
                    <span>Préparer démo</span>
                  </div>
                </v-card-text>
              </v-card>
            </div>
          </v-col>
        </v-row>
      </v-container>

      <!-- Features Section -->
      <v-container id="features" class="features-section">
        <v-row>
          <v-col cols="12" class="text-center mb-8">
            <h2 class="text-h3 font-weight-bold">Fonctionnalités Principales</h2>
          </v-col>
        </v-row>

        <v-row>
          <v-col v-for="feature in features" :key="feature.title" cols="12" sm="6" md="4">
            <v-card class="feature-card" elevation="4" hover>
              <v-card-text class="text-center pa-6">
                <v-avatar size="80" class="mb-4" color="primary" variant="tonal">
                  <v-icon size="40" :icon="feature.icon" />
                </v-avatar>

                <v-card-title class="text-h6 mb-2">
                  {{ feature.title }}
                </v-card-title>

                <p class="text-body-2 text-medium-emphasis">
                  {{ feature.description }}
                </p>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>

      <!-- CTA Section -->
      <v-container fluid class="cta-section">
        <v-row justify="center">
          <v-col cols="12" md="8" class="text-center">
            <h2 class="text-h3 font-weight-bold mb-4">
              Prêt à optimiser votre gestion commerciale ?
            </h2>
            <p class="text-h6 mb-8">
              Rejoignez les professionnels qui font confiance à OPEx_CRM
            </p>
            <v-btn
              color="amber-accent-3"
              size="x-large"
              prepend-icon="mdi-arrow-right"
              variant="elevated"
              @click="goToLogin"
            >
              Commencer maintenant
            </v-btn>
          </v-col>
        </v-row>
      </v-container>

      <!-- Footer -->
      <v-footer class="footer">
        <v-container>
          <v-row>
            <v-col cols="12" md="4">
              <h4 class="text-h6 font-weight-bold mb-4 text-amber-accent-3">OPEx_CRM</h4>
              <p class="text-body-2 text-grey-lighten-1">
                Solution complète pour la gestion commerciale dans le secteur médical
              </p>
            </v-col>

            <v-col cols="12" md="4">
              <h4 class="text-h6 font-weight-bold mb-4 text-amber-accent-3">
                Liens Utiles
              </h4>
              <v-list class="bg-transparent">
                <v-list-item @click="goToLogin" class="pa-0">
                  <v-list-item-title class="text-grey-lighten-1">
                    Connexion
                  </v-list-item-title>
                </v-list-item>
                <v-list-item @click="scrollToFeatures" class="pa-0">
                  <v-list-item-title class="text-grey-lighten-1">
                    Fonctionnalités
                  </v-list-item-title>
                </v-list-item>
              </v-list>
            </v-col>

            <v-col cols="12" md="4">
              <h4 class="text-h6 font-weight-bold mb-4 text-amber-accent-3">Contact</h4>
              <p class="text-body-2 text-grey-lighten-1">support@medical-crm.com</p>
            </v-col>
          </v-row>

          <v-divider class="my-6" />

          <v-row>
            <v-col cols="12" class="text-center">
              <p class="text-body-2 text-grey">
                &copy; 2025 OPEx_CRM. Tous droits réservés.
              </p>
            </v-col>
          </v-row>
        </v-container>
      </v-footer>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router"

const router = useRouter()

const features = [
  {
    title: "Gestion des Institutions",
    description:
      "Centralisez toutes les informations de vos institutions médicales partenaires",
    icon: "mdi-domain",
  },
  {
    title: "Suivi des Tâches",
    description:
      "Organisez et suivez vos tâches commerciales avec un système de workflow intuitif",
    icon: "mdi-check-circle",
  },
  {
    title: "Devis & Factures",
    description:
      "Générez et gérez vos devis et factures directement depuis la plateforme",
    icon: "mdi-file-document-edit",
  },
  {
    title: "Gestion d'Équipe",
    description: "Collaborez efficacement avec votre équipe et assignez les tâches",
    icon: "mdi-account-group",
  },
  {
    title: "Tableau de Bord",
    description: "Visualisez vos performances et KPIs en temps réel",
    icon: "mdi-chart-line",
  },
  {
    title: "Sécurité",
    description: "Données sécurisées et conformes aux standards médicaux",
    icon: "mdi-shield-check",
  },
]

const goToLogin = () => {
  router.push("/login")
}

const scrollToFeatures = () => {
  const element = document.getElementById("features")
  if (element) {
    element.scrollIntoView({ behavior: "smooth" })
  }
}
</script>

<style scoped>
/* Hero Section */
.hero-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  min-height: 100vh;
  padding: 4rem 2rem;
  display: flex;
  align-items: center;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 1.5rem;
}

.hero-highlight {
  color: #fbbf24;
  display: block;
  font-size: 2rem;
}

.hero-description {
  font-size: 1.1rem;
  line-height: 1.6;
  margin-bottom: 2rem;
  opacity: 0.9;
  max-width: 500px;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.hero-image-container {
  position: relative;
  width: 100%;
  max-width: 450px;
  height: 400px;
  transform: rotate(-5deg);
}
.mockup-card,
.mockup-card-2,
.mockup-card-3 {
  position: absolute;
  background-color: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 16px;
}
.mockup-card {
  width: 70%;
  top: 0;
  left: 0;
  transform: rotate(-10deg);
}
.mockup-card-2 {
  width: 60%;
  bottom: 20px;
  right: 0;
  transform: rotate(8deg);
}
.mockup-card-3 {
  width: 55%;
  bottom: 120px;
  left: 30px;
  transform: rotate(5deg);
}

.mini-chart {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 60px;
}

.mini-chart-bar {
  flex: 1;
  background: linear-gradient(180deg, #40c4ff 0%, #00b0ff 100%);
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  animation: growBar 0.8s ease-out forwards;
}

@keyframes growBar {
  from {
    transform: scaleY(0);
    transform-origin: bottom;
  }
  to {
    transform: scaleY(1);
    transform-origin: bottom;
  }
}

/* Features Section */
.features-section {
  padding: 6rem 2rem;
  background: #f8f9fa;
}

.feature-card {
  height: 100%;
  transition:
    transform 0.2s ease-in-out,
    box-shadow 0.2s ease-in-out;
  border-radius: 16px;
}

.feature-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

/* CTA Section */
.cta-section {
  background: #1f2937;
  color: white;
  padding: 6rem 2rem;
}

/* Footer */
.footer {
  background: #111827;
  color: white;
  padding: 3rem 2rem 1rem;
}

/* Responsive Design */
@media (max-width: 960px) {
  .hero-section {
    padding-top: 6rem;
    padding-bottom: 4rem;
    min-height: auto;
  }
  .hero-image-container {
    margin-top: 4rem;
    transform: rotate(0);
    max-width: 350px;
    height: 300px;
  }
  .hero-title {
    font-size: 2.5rem;
  }
  .hero-description {
    font-size: 1.1rem;
  }
  .hero-actions {
    justify-content: center;
  }
}
</style>
