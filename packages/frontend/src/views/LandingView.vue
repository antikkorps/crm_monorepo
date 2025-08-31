<template>
  <v-app>
    <v-main>
      <!-- Hero Section -->
      <v-container fluid class="hero-section">
        <v-row align="center" class="fill-height">
          <v-col cols="12" md="6">
            <div class="hero-content">
              <h1 class="hero-title">
                Medical CRM
                <span class="hero-highlight">Nouvelle Génération</span>
              </h1>
              <p class="hero-description">
                Gérez efficacement vos relations avec les institutions médicales, suivez vos
                tâches et optimisez votre workflow commercial dans le secteur médical.
              </p>
              <div class="hero-actions">
                <v-btn
                  color="amber-accent-3"
                  size="x-large"
                  prepend-icon="mdi-login"
                  variant="elevated"
                  @click="goToLogin"
                  class="mr-4"
                >
                  Se connecter
                </v-btn>
                <v-btn
                  color="white"
                  size="x-large"
                  prepend-icon="mdi-arrow-down"
                  variant="outlined"
                  @click="scrollToFeatures"
                >
                  En savoir plus
                </v-btn>
              </div>
            </div>
          </v-col>
          <v-col cols="12" md="6" class="text-center">
            <v-icon size="200" color="rgba(255, 255, 255, 0.2)">
              mdi-heart-pulse
            </v-icon>
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
          <v-col
            v-for="feature in features"
            :key="feature.title"
            cols="12"
            sm="6"
            md="4"
          >
            <v-card
              class="feature-card"
              elevation="4"
              hover
            >
              <v-card-text class="text-center pa-6">
                <v-avatar
                  size="80"
                  class="mb-4"
                  color="primary"
                  variant="tonal"
                >
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
              Rejoignez les professionnels qui font confiance à Medical CRM
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
              <h4 class="text-h6 font-weight-bold mb-4 text-amber-accent-3">
                Medical CRM
              </h4>
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
              <h4 class="text-h6 font-weight-bold mb-4 text-amber-accent-3">
                Contact
              </h4>
              <p class="text-body-2 text-grey-lighten-1">
                support@medical-crm.com
              </p>
            </v-col>
          </v-row>
          
          <v-divider class="my-6" />
          
          <v-row>
            <v-col cols="12" class="text-center">
              <p class="text-body-2 text-grey">
                &copy; 2025 Medical CRM. Tous droits réservés.
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
    description: "Centralisez toutes les informations de vos institutions médicales partenaires",
    icon: "mdi-domain"
  },
  {
    title: "Suivi des Tâches", 
    description: "Organisez et suivez vos tâches commerciales avec un système de workflow intuitif",
    icon: "mdi-check-circle"
  },
  {
    title: "Devis & Factures",
    description: "Générez et gérez vos devis et factures directement depuis la plateforme",
    icon: "mdi-file-document-edit"
  },
  {
    title: "Gestion d'Équipe",
    description: "Collaborez efficacement avec votre équipe et assignez les tâches",
    icon: "mdi-account-group"
  },
  {
    title: "Tableau de Bord",
    description: "Visualisez vos performances et KPIs en temps réel",
    icon: "mdi-chart-line"
  },
  {
    title: "Sécurité",
    description: "Données sécurisées et conformes aux standards médicaux",
    icon: "mdi-shield-check"
  }
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
  padding: 4rem 0;
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
}

.hero-description {
  font-size: 1.25rem;
  line-height: 1.6;
  margin-bottom: 2rem;
  opacity: 0.9;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

/* Features Section */
.features-section {
  padding: 6rem 0;
  background: #f8f9fa;
}

.feature-card {
  height: 100%;
  transition: transform 0.2s ease-in-out;
}

.feature-card:hover {
  transform: translateY(-4px);
}

/* CTA Section */
.cta-section {
  background: #1f2937;
  color: white;
  padding: 6rem 0;
}

/* Footer */
.footer {
  background: #111827;
  color: white;
  padding: 3rem 0 1rem;
}

/* Responsive Design */
@media (max-width: 768px) {
  .hero-title {
    font-size: 2.5rem;
  }
  
  .hero-actions {
    justify-content: center;
  }
}
</style>
