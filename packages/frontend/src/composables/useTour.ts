import Shepherd from "shepherd.js"
import "shepherd.js/dist/css/shepherd.css"
import { ref } from "vue"

export type TourName = "dashboard" | "institutions" | "opportunities" | "analytics"

/**
 * Composable for managing guided tours using Shepherd.js
 */
export function useTour() {
  const activeTour = ref<Shepherd.Tour | null>(null)

  /**
   * Create base tour configuration
   */
  const createTour = (): Shepherd.Tour => {
    return new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        cancelIcon: {
          enabled: true,
        },
        classes: "shepherd-theme-custom",
        scrollTo: { behavior: "smooth", block: "center" },
      },
    })
  }

  /**
   * Dashboard tour
   */
  const dashboardTour = (): Shepherd.Tour => {
    const tour = createTour()

    tour.addStep({
      id: "welcome",
      title: "🎉 Bienvenue dans Medical CRM !",
      text: "Laissez-nous vous guider à travers les fonctionnalités principales de votre CRM.",
      buttons: [
        {
          text: "Passer",
          classes: "shepherd-button-secondary",
          action: tour.complete,
        },
        {
          text: "Suivant",
          action: tour.next,
        },
      ],
    })

    tour.addStep({
      id: "stats-cards",
      title: "📊 Statistiques en un coup d'œil",
      text: "Ces cartes affichent vos métriques clés : institutions, tâches, équipe et chiffre d'affaires du mois. Cliquez sur une carte pour accéder aux détails.",
      attachTo: {
        element: ".stat-card:first-child",
        on: "bottom",
      },
      buttons: [
        {
          text: "Précédent",
          classes: "shepherd-button-secondary",
          action: tour.back,
        },
        {
          text: "Suivant",
          action: tour.next,
        },
      ],
    })

    tour.addStep({
      id: "hot-leads",
      title: "🔥 Leads Chauds",
      text: "Vos prospects à fort potentiel sont affichés ici avec leur score. Cliquez pour voir les détails ou créer une opportunité.",
      attachTo: {
        element: ".hot-leads-widget",
        on: "top",
      },
      buttons: [
        {
          text: "Précédent",
          classes: "shepherd-button-secondary",
          action: tour.back,
        },
        {
          text: "Suivant",
          action: tour.next,
        },
      ],
    })

    tour.addStep({
      id: "navigation",
      title: "🧭 Navigation",
      text: "Accédez à toutes les sections depuis la barre latérale : Institutions, Pipeline, Analytics, Collaboration, etc.",
      attachTo: {
        element: ".v-navigation-drawer",
        on: "right",
      },
      buttons: [
        {
          text: "Précédent",
          classes: "shepherd-button-secondary",
          action: tour.back,
        },
        {
          text: "Terminer",
          action: tour.complete,
        },
      ],
    })

    return tour
  }

  /**
   * Institutions tour
   */
  const institutionsTour = (): Shepherd.Tour => {
    const tour = createTour()

    tour.addStep({
      id: "institutions-welcome",
      title: "🏥 Gestion des Institutions",
      text: "Gérez vos institutions médicales : hôpitaux, cliniques, laboratoires, etc.",
      buttons: [
        {
          text: "Passer",
          classes: "shepherd-button-secondary",
          action: tour.complete,
        },
        {
          text: "Suivant",
          action: tour.next,
        },
      ],
    })

    tour.addStep({
      id: "create-institution",
      title: "➕ Créer une Institution",
      text: "Cliquez ici pour ajouter une nouvelle institution. Vous pourrez ensuite ajouter des contacts, des notes, et suivre l'historique.",
      attachTo: {
        element: "button[prepend-icon='mdi-plus']",
        on: "bottom",
      },
      buttons: [
        {
          text: "Précédent",
          classes: "shepherd-button-secondary",
          action: tour.back,
        },
        {
          text: "Suivant",
          action: tour.next,
        },
      ],
    })

    tour.addStep({
      id: "filters",
      title: "🔍 Filtres",
      text: "Utilisez les filtres pour trouver rapidement vos institutions par type, statut, ou tags.",
      attachTo: {
        element: ".filters",
        on: "bottom",
      },
      buttons: [
        {
          text: "Précédent",
          classes: "shepherd-button-secondary",
          action: tour.back,
        },
        {
          text: "Suivant",
          action: tour.next,
        },
      ],
    })

    tour.addStep({
      id: "institution-card",
      title: "📋 Carte Institution",
      text: "Cliquez sur une carte pour voir les détails complets : contacts, profil médical, revenus, timeline, et insights.",
      attachTo: {
        element: ".institution-card:first-child",
        on: "top",
      },
      buttons: [
        {
          text: "Précédent",
          classes: "shepherd-button-secondary",
          action: tour.back,
        },
        {
          text: "Terminer",
          action: tour.complete,
        },
      ],
    })

    return tour
  }

  /**
   * Opportunities tour
   */
  const opportunitiesTour = (): Shepherd.Tour => {
    const tour = createTour()

    tour.addStep({
      id: "opportunities-welcome",
      title: "💼 Pipeline de Ventes",
      text: "Suivez vos opportunités commerciales de la prospection à la conclusion.",
      buttons: [
        {
          text: "Passer",
          classes: "shepherd-button-secondary",
          action: tour.complete,
        },
        {
          text: "Suivant",
          action: tour.next,
        },
      ],
    })

    tour.addStep({
      id: "kanban-board",
      title: "📊 Vue Kanban",
      text: "Visualisez votre pipeline en colonnes par étape. Glissez-déposez les opportunités pour changer leur statut.",
      attachTo: {
        element: ".kanban-board",
        on: "top",
      },
      buttons: [
        {
          text: "Précédent",
          classes: "shepherd-button-secondary",
          action: tour.back,
        },
        {
          text: "Suivant",
          action: tour.next,
        },
      ],
    })

    tour.addStep({
      id: "pipeline-stats",
      title: "📈 Statistiques Pipeline",
      text: "Suivez vos métriques clés : taux de conversion, valeur totale du pipeline, deals gagnés/perdus.",
      attachTo: {
        element: ".pipeline-stats",
        on: "bottom",
      },
      buttons: [
        {
          text: "Précédent",
          classes: "shepherd-button-secondary",
          action: tour.back,
        },
        {
          text: "Terminer",
          action: tour.complete,
        },
      ],
    })

    return tour
  }

  /**
   * Analytics tour
   */
  const analyticsTour = (): Shepherd.Tour => {
    const tour = createTour()

    tour.addStep({
      id: "analytics-welcome",
      title: "📊 Analytics & Intelligence",
      text: "Analysez vos performances commerciales et obtenez des insights pour optimiser vos ventes.",
      buttons: [
        {
          text: "Passer",
          classes: "shepherd-button-secondary",
          action: tour.complete,
        },
        {
          text: "Suivant",
          action: tour.next,
        },
      ],
    })

    tour.addStep({
      id: "kpi-cards",
      title: "🎯 KPIs Clés",
      text: "Taux de réussite, revenu prévu, cycle de vente moyen, et pipeline actuel.",
      attachTo: {
        element: ".analytics-view .v-row:first-child",
        on: "bottom",
      },
      buttons: [
        {
          text: "Précédent",
          classes: "shepherd-button-secondary",
          action: tour.back,
        },
        {
          text: "Suivant",
          action: tour.next,
        },
      ],
    })

    tour.addStep({
      id: "win-loss-analysis",
      title: "✅ Analyse Victoires/Pertes",
      text: "Découvrez pourquoi vous gagnez ou perdez vos deals. Utilisez ces insights pour améliorer votre stratégie.",
      attachTo: {
        element: ".analytics-view .v-row:nth-child(3)",
        on: "top",
      },
      buttons: [
        {
          text: "Précédent",
          classes: "shepherd-button-secondary",
          action: tour.back,
        },
        {
          text: "Terminer",
          action: tour.complete,
        },
      ],
    })

    return tour
  }

  /**
   * Start a tour by name
   */
  const startTour = (tourName: TourName) => {
    // Complete any active tour first
    if (activeTour.value) {
      activeTour.value.complete()
    }

    // Create and start the new tour
    let tour: Shepherd.Tour
    switch (tourName) {
      case "dashboard":
        tour = dashboardTour()
        break
      case "institutions":
        tour = institutionsTour()
        break
      case "opportunities":
        tour = opportunitiesTour()
        break
      case "analytics":
        tour = analyticsTour()
        break
      default:
        return
    }

    activeTour.value = tour

    // Track tour completion
    tour.on("complete", () => {
      localStorage.setItem(`tour_${tourName}_completed`, "true")
      activeTour.value = null
    })

    tour.on("cancel", () => {
      activeTour.value = null
    })

    tour.start()
  }

  /**
   * Check if a tour has been completed
   */
  const isTourCompleted = (tourName: TourName): boolean => {
    return localStorage.getItem(`tour_${tourName}_completed`) === "true"
  }

  /**
   * Reset a tour (mark as not completed)
   */
  const resetTour = (tourName: TourName) => {
    localStorage.removeItem(`tour_${tourName}_completed`)
  }

  /**
   * Reset all tours
   */
  const resetAllTours = () => {
    const tourNames: TourName[] = ["dashboard", "institutions", "opportunities", "analytics"]
    tourNames.forEach(resetTour)
  }

  return {
    startTour,
    isTourCompleted,
    resetTour,
    resetAllTours,
    activeTour,
  }
}
