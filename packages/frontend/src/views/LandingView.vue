<template>
  <div class="landing-page">
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-content">
        <div class="hero-text">
          <h1 class="hero-title">
            Medical CRM
            <span class="hero-highlight">Nouvelle Génération</span>
          </h1>
          <p class="hero-description">
            Gérez efficacement vos relations avec les institutions médicales, suivez vos
            tâches et optimisez votre workflow commercial dans le secteur médical.
          </p>
          <div class="hero-actions">
            <Button
              label="Se connecter"
              icon="pi pi-sign-in"
              class="hero-button primary"
              @click="goToLogin"
            />
            <Button
              label="En savoir plus"
              icon="pi pi-arrow-down"
              class="hero-button secondary"
              outlined
              @click="scrollToFeatures"
            />
          </div>
        </div>
        <div class="hero-image">
          <i class="pi pi-heart-fill hero-icon"></i>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="features-section">
      <div class="container">
        <h2 class="section-title">Fonctionnalités Principales</h2>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">
              <i class="pi pi-building"></i>
            </div>
            <h3>Gestion des Institutions</h3>
            <p>
              Centralisez toutes les informations de vos institutions médicales
              partenaires
            </p>
          </div>

          <div class="feature-card">
            <div class="feature-icon">
              <i class="pi pi-check-square"></i>
            </div>
            <h3>Suivi des Tâches</h3>
            <p>
              Organisez et suivez vos tâches commerciales avec un système de workflow
              intuitif
            </p>
          </div>

          <div class="feature-card">
            <div class="feature-icon">
              <i class="pi pi-file-edit"></i>
            </div>
            <h3>Devis & Factures</h3>
            <p>Générez et gérez vos devis et factures directement depuis la plateforme</p>
          </div>

          <div class="feature-card">
            <div class="feature-icon">
              <i class="pi pi-users"></i>
            </div>
            <h3>Gestion d'Équipe</h3>
            <p>Collaborez efficacement avec votre équipe et assignez les tâches</p>
          </div>

          <div class="feature-card">
            <div class="feature-icon">
              <i class="pi pi-chart-line"></i>
            </div>
            <h3>Tableau de Bord</h3>
            <p>Visualisez vos performances et KPIs en temps réel</p>
          </div>

          <div class="feature-card">
            <div class="feature-icon">
              <i class="pi pi-shield"></i>
            </div>
            <h3>Sécurité</h3>
            <p>Données sécurisées et conformes aux standards médicaux</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section">
      <div class="container">
        <div class="cta-content">
          <h2>Prêt à optimiser votre gestion commerciale ?</h2>
          <p>Rejoignez les professionnels qui font confiance à Medical CRM</p>
          <Button
            label="Commencer maintenant"
            icon="pi pi-arrow-right"
            class="cta-button"
            @click="goToLogin"
          />
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <div class="container">
        <div class="footer-content">
          <div class="footer-section">
            <h4>Medical CRM</h4>
            <p>Solution complète pour la gestion commerciale dans le secteur médical</p>
          </div>
          <div class="footer-section">
            <h4>Liens Utiles</h4>
            <ul>
              <li><a href="#" @click.prevent="goToLogin">Connexion</a></li>
              <li>
                <a href="#features" @click.prevent="scrollToFeatures">Fonctionnalités</a>
              </li>
            </ul>
          </div>
          <div class="footer-section">
            <h4>Contact</h4>
            <p>support@medical-crm.com</p>
          </div>
        </div>
        <div class="footer-bottom">
          <p>&copy; 2025 Medical CRM. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import Button from "primevue/button"
import { useRouter } from "vue-router"

const router = useRouter()

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
.landing-page {
  min-height: 100vh;
}

/* Hero Section */
.hero-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 4rem 2rem;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-content {
  max-width: 1200px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
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

.hero-button {
  padding: 0.875rem 2rem;
  font-weight: 600;
  font-size: 1.1rem;
}

.hero-button.primary {
  background: #fbbf24;
  border-color: #fbbf24;
}

.hero-button.primary:hover {
  background: #f59e0b;
  border-color: #f59e0b;
}

.hero-image {
  display: flex;
  justify-content: center;
  align-items: center;
}

.hero-icon {
  font-size: 12rem;
  color: rgba(255, 255, 255, 0.2);
}

/* Features Section */
.features-section {
  padding: 6rem 2rem;
  background: #f9fafb;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.section-title {
  text-align: center;
  font-size: 2.5rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 3rem;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.feature-card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  text-align: center;
  transition: transform 0.2s, box-shadow 0.2s;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
}

.feature-icon {
  width: 4rem;
  height: 4rem;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
}

.feature-icon i {
  font-size: 1.5rem;
  color: white;
}

.feature-card h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 1rem;
}

.feature-card p {
  color: #6b7280;
  line-height: 1.6;
}

/* CTA Section */
.cta-section {
  background: #1f2937;
  color: white;
  padding: 4rem 2rem;
  text-align: center;
}

.cta-content h2 {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.cta-content p {
  font-size: 1.25rem;
  opacity: 0.9;
  margin-bottom: 2rem;
}

.cta-button {
  background: #fbbf24;
  border-color: #fbbf24;
  padding: 1rem 2rem;
  font-size: 1.1rem;
  font-weight: 600;
}

.cta-button:hover {
  background: #f59e0b;
  border-color: #f59e0b;
}

/* Footer */
.footer {
  background: #111827;
  color: white;
  padding: 3rem 2rem 1rem;
}

.footer-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
}

.footer-section h4 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #fbbf24;
}

.footer-section p {
  color: #d1d5db;
  line-height: 1.6;
}

.footer-section ul {
  list-style: none;
  padding: 0;
}

.footer-section ul li {
  margin-bottom: 0.5rem;
}

.footer-section ul li a {
  color: #d1d5db;
  text-decoration: none;
  transition: color 0.2s;
}

.footer-section ul li a:hover {
  color: #fbbf24;
}

.footer-bottom {
  border-top: 1px solid #374151;
  padding-top: 1rem;
  text-align: center;
  color: #9ca3af;
}

/* Responsive Design */
@media (max-width: 768px) {
  .hero-content {
    grid-template-columns: 1fr;
    text-align: center;
    gap: 2rem;
  }

  .hero-title {
    font-size: 2.5rem;
  }

  .hero-actions {
    justify-content: center;
  }

  .hero-icon {
    font-size: 8rem;
  }

  .section-title {
    font-size: 2rem;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .cta-content h2 {
    font-size: 2rem;
  }
}
</style>
