import { driver } from "driver.js"
import "driver.js/dist/driver.css"
import { ref } from "vue"

export type TourName = "dashboard" | "institutions" | "opportunities" | "analytics"

/**
 * Composable for managing guided tours using Driver.js
 */
export function useTour() {
  const activeTour = ref<ReturnType<typeof driver> | null>(null)

  /**
   * Dashboard tour
   */
  const dashboardTour = (): ReturnType<typeof driver> => {
    const tour = driver({
      showProgress: true,
      steps: [
        {
          element: "#dashboard",
          popover: {
            title: "🎉 Bienvenue dans Medical CRM !",
            description: "Laissez-nous vous guider à travers les fonctionnalités principales de votre CRM.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#quick-actions",
          popover: {
            title: "Actions rapides",
            description: "Accédez rapidement aux actions courantes comme créer un nouveau contact ou devis.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#recent-activity",
          popover: {
            title: "Activité récente",
            description: "Consultez les dernières activités de votre équipe.",
            side: "bottom",
            align: "start",
          },
        },
      ],
    })

    return tour
  }

  /**
   * Institutions tour
   */
  const institutionsTour = (): ReturnType<typeof driver> => {
    const tour = driver({
      showProgress: true,
      steps: [
        {
          element: "#institutions-list",
          popover: {
            title: "Liste des établissements",
            description: "Voyez tous les établissements médicaux que vous suivez.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#add-institution",
          popover: {
            title: "Ajouter un établissement",
            description: "Cliquez ici pour ajouter un nouvel établissement médical.",
            side: "left",
            align: "center",
          },
        },
        {
          element: "#search-institutions",
          popover: {
            title: "Recherche",
            description: "Recherchez rapidement des établissements par nom, ville, etc.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#filters",
          popover: {
            title: "Filtres",
            description: "Filtrez les établissements par type, statut, ou segment.",
            side: "bottom",
            align: "start",
          },
        },
      ],
    })

    return tour
  }

  /**
   * Opportunities tour
   */
  const opportunitiesTour = (): ReturnType<typeof driver> => {
    const tour = driver({
      showProgress: true,
      steps: [
        {
          element: "#opportunities-pipeline",
          popover: {
            title: "Pipeline d'opportunités",
            description: "Visualisez vos opportunités à travers le pipeline de vente.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#add-opportunity",
          popover: {
            title: "Nouvelle opportunité",
            description: "Créez une nouvelle opportunité commerciale.",
            side: "left",
            align: "center",
          },
        },
        {
          element: "#forecast",
          popover: {
            title: "Prévisions",
            description: "Consultez les prévisions de revenus basées sur vos opportunités.",
            side: "bottom",
            align: "start",
          },
        },
      ],
    })

    return tour
  }

  /**
   * Analytics tour
   */
  const analyticsTour = (): ReturnType<typeof driver> => {
    const tour = driver({
      showProgress: true,
      steps: [
        {
          element: "#analytics-overview",
          popover: {
            title: "Vue d'ensemble",
            description: "Statistiques clés de votre CRM.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#charts",
          popover: {
            title: "Graphiques",
            description: "Visualisez vos données avec des graphiques interactifs.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#reports",
          popover: {
            title: "Rapports",
            description: "Générez des rapports détaillés sur vos activités.",
            side: "bottom",
            align: "start",
          },
        },
      ],
    })

    return tour
  }

  /**
   * Start a specific tour
   */
  const startTour = (tourName: TourName) => {
    // Stop any active tour first
    if (activeTour.value) {
      activeTour.value.destroy()
      activeTour.value = null
    }

    let tour: ReturnType<typeof driver>

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

    // Mark tour as completed when it's finished
    tour.onDestroyStarted(() => {
      markTourCompleted(tourName)
      activeTour.value = null
    })

    tour.drive()
    activeTour.value = tour
  }

  /**
   * Stop the current tour
   */
  const stopTour = () => {
    if (activeTour.value) {
      activeTour.value.destroy()
      activeTour.value = null
    }
  }

  /**
   * Check if a tour has been completed
   */
  const isTourCompleted = (tourName: TourName): boolean => {
    const completedTours = localStorage.getItem("completed_tours")
    if (!completedTours) return false

    try {
      const tours = JSON.parse(completedTours) as string[]
      return tours.includes(tourName)
    } catch {
      return false
    }
  }

  /**
   * Mark a tour as completed
   */
  const markTourCompleted = (tourName: TourName) => {
    const completedTours = localStorage.getItem("completed_tours")
    let tours: string[] = []

    if (completedTours) {
      try {
        tours = JSON.parse(completedTours) as string[]
      } catch {
        tours = []
      }
    }

    if (!tours.includes(tourName)) {
      tours.push(tourName)
      localStorage.setItem("completed_tours", JSON.stringify(tours))
    }
  }

  /**
   * Reset all tours (clear completion status)
   */
  const resetAllTours = () => {
    localStorage.removeItem("completed_tours")
  }

  return {
    startTour,
    stopTour,
    activeTour,
    isTourCompleted,
    resetAllTours,
  }
}
