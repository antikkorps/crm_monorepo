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
  const dashboardTour = (onComplete?: () => void): ReturnType<typeof driver> => {
    const tour = driver({
      showProgress: true,
      showButtons: ["next", "previous", "close"],
      onDestroyed: onComplete,
      steps: [
        {
          popover: {
            title: "🎉 Bienvenue sur votre Tableau de Bord !",
            description:
              "Découvrez en quelques étapes comment utiliser efficacement votre tableau de bord OPEx_CRM. Cette visite guidée vous prendra environ 2 minutes.",
          },
        },
        {
          element: "#tour-stats-cards",
          popover: {
            title: "📊 Vos Indicateurs Clés",
            description:
              "Ces 4 cartes affichent vos statistiques essentielles : établissements, tâches, équipes et revenus. Cliquez sur une carte pour accéder aux détails.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#tour-performance-metrics",
          popover: {
            title: "📈 Métriques de Performance",
            description:
              "Suivez l'évolution de vos performances : croissance du chiffre d'affaires, nouveaux clients et taux de conversion. Ces données vous aident à mesurer votre succès.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#tour-period-selector",
          popover: {
            title: "🗓️ Sélecteur de Période",
            description:
              "Choisissez la période d'analyse : semaine, mois ou trimestre. Les graphiques et métriques s'ajustent automatiquement.",
            side: "left",
            align: "start",
          },
        },
        {
          element: "#tour-kpi-charts",
          popover: {
            title: "📉 Graphiques KPI",
            description:
              "Visualisez l'évolution de vos indicateurs clés sous forme de graphiques interactifs. Idéal pour identifier les tendances et opportunités.",
            side: "top",
            align: "start",
          },
        },
        {
          element: "#tour-smart-alerts",
          popover: {
            title: "🔔 Alertes Intelligentes",
            description:
              "Recevez des alertes automatiques sur les actions importantes : devis à relancer, factures impayées, tâches en retard. Cliquez sur une alerte pour agir directement.",
            side: "right",
            align: "start",
          },
        },
        {
          element: "#tour-timeline",
          popover: {
            title: "⏱️ Timeline d'Activité",
            description:
              "Suivez en temps réel toutes les actions de votre équipe : créations, modifications, rendez-vous. Restez informé de tout ce qui se passe.",
            side: "left",
            align: "start",
          },
        },
        {
          element: "#tour-quick-actions",
          popover: {
            title: "⚡ Actions Rapides",
            description:
              "Accédez instantanément aux actions les plus courantes : créer un établissement, consulter les analytics ou planifier une tâche. Gain de temps assuré !",
            side: "top",
            align: "start",
          },
        },
        {
          element: "#tour-hot-leads",
          popover: {
            title: "🔥 Leads Chauds",
            description:
              "Identifiez vos opportunités les plus prometteuses grâce à notre système de scoring. Concentrez vos efforts sur les prospects à fort potentiel.",
            side: "top",
            align: "start",
          },
        },
        {
          element: "#tour-recent-tasks",
          popover: {
            title: "✅ Tâches Récentes",
            description:
              "Visualisez vos dernières tâches et leur statut. Restez organisé et ne manquez jamais une échéance importante.",
            side: "top",
            align: "start",
          },
        },
        {
          popover: {
            title: "🎓 Vous êtes prêt !",
            description:
              "Vous maîtrisez maintenant les bases du tableau de bord. Explorez les autres sections pour découvrir toutes les fonctionnalités de OPEx_CRM. Bon travail ! 🚀",
          },
        },
      ],
    })

    return tour
  }

  /**
   * Institutions tour
   */
  const institutionsTour = (onComplete?: () => void): ReturnType<typeof driver> => {
    const tour = driver({
      showProgress: true,
      showButtons: ["next", "previous", "close"],
      onDestroyed: onComplete,
      steps: [
        {
          popover: {
            title: "🏥 Bienvenue dans la Gestion des Établissements !",
            description:
              "Découvrez comment gérer efficacement votre portefeuille d'établissements médicaux : création, recherche, filtrage et suivi.",
          },
        },
        {
          element: "#tour-institutions-stats",
          popover: {
            title: "📊 Statistiques en un Coup d'Œil",
            description:
              "Visualisez instantanément vos métriques clés : nombre total d'établissements, institutions actives, dossiers en attente de révision et établissements non conformes.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#tour-institutions-add",
          popover: {
            title: "➕ Créer un Établissement",
            description:
              "Ajoutez un nouvel établissement médical à votre portefeuille. Le formulaire vous guide à travers toutes les informations nécessaires : coordonnées, profil médical, contacts.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#tour-institutions-import",
          popover: {
            title: "📤 Import CSV",
            description:
              "Importez plusieurs établissements simultanément via un fichier CSV. Idéal pour migrer vos données existantes ou ajouter des établissements en masse.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#tour-institutions-search",
          popover: {
            title: "🔍 Recherche Rapide",
            description:
              "Recherchez instantanément un établissement par nom, ville, code postal ou tout autre critère. La recherche est en temps réel et très rapide.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#tour-institutions-advanced-filters",
          popover: {
            title: "🎯 Filtres Avancés",
            description:
              "Affinez votre recherche avec les filtres avancés : type d'établissement, ville, responsable assigné, statut de conformité. Combinez plusieurs filtres pour des résultats précis.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#tour-institutions-table",
          popover: {
            title: "📋 Tableau de Gestion",
            description:
              "Gérez vos établissements depuis ce tableau : consultez les détails, modifiez les informations, désactivez ou supprimez des institutions. Les établissements inactifs sont grisés.",
            side: "top",
            align: "start",
          },
        },
        {
          popover: {
            title: "✨ Vous maîtrisez la gestion des établissements !",
            description:
              "Vous savez maintenant créer, rechercher, filtrer et gérer vos établissements médicaux. N'oubliez pas : les institutions enrichies (avec notes ou réunions) sont protégées et ne peuvent être que désactivées. 🔒",
          },
        },
      ],
    })

    return tour
  }

  /**
   * Opportunities tour
   */
  const opportunitiesTour = (onComplete?: () => void): ReturnType<typeof driver> => {
    const tour = driver({
      showProgress: true,
      showButtons: ["next", "previous", "close"],
      onDestroyed: onComplete,
      steps: [
        {
          popover: {
            title: "💼 Bienvenue dans le Pipeline de Ventes !",
            description:
              "Gérez visuellement vos opportunités commerciales du premier contact jusqu'à la signature. Suivez, organisez et maximisez vos chances de succès.",
          },
        },
        {
          element: "#tour-opportunities-stats",
          popover: {
            title: "📈 Indicateurs du Pipeline",
            description:
              "Consultez vos métriques essentielles : nombre d'opportunités actives, valeur totale du pipeline, valeur pondérée (ajustée selon la probabilité) et opportunités en retard.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#tour-opportunities-add",
          popover: {
            title: "✨ Créer une Opportunité",
            description:
              "Ajoutez une nouvelle opportunité commerciale : choisissez l'établissement, définissez la valeur, le stade, la probabilité et la date de clôture prévue.",
            side: "left",
            align: "start",
          },
        },
        {
          element: "#tour-opportunities-forecast",
          popover: {
            title: "🔮 Prévisions de Revenus",
            description:
              "Activez les prévisions pour visualiser vos revenus attendus mois par mois. Les calculs sont basés sur la valeur pondérée de vos opportunités (valeur × probabilité).",
            side: "left",
            align: "start",
          },
        },
        {
          element: "#tour-opportunities-pipeline",
          popover: {
            title: "🎯 Pipeline Kanban Interactif",
            description:
              "Glissez-déposez vos opportunités d'un stade à l'autre pour mettre à jour leur progression. Chaque colonne affiche le nombre d'opportunités et la valeur totale. Cliquez sur une carte pour voir les détails.",
            side: "top",
            align: "start",
          },
        },
        {
          popover: {
            title: "🚀 Le pipeline n'a plus de secrets pour vous !",
            description:
              "Vous savez maintenant gérer vos opportunités en mode visuel. Utilisez le drag & drop pour faire avancer vos deals et consultez les prévisions pour anticiper vos revenus. Bon closing ! 💪",
          },
        },
      ],
    })

    return tour
  }

  /**
   * Analytics tour
   */
  const analyticsTour = (onComplete?: () => void): ReturnType<typeof driver> => {
    const tour = driver({
      showProgress: true,
      showButtons: ["next", "previous", "close"],
      onDestroyed: onComplete,
      steps: [
        {
          popover: {
            title: "📊 Bienvenue dans Analytics & Intelligence !",
            description:
              "Analysez vos performances commerciales en profondeur : taux de réussite, revenus, cycle de vente et bien plus. Prenez des décisions basées sur les données.",
          },
        },
        {
          element: "#tour-analytics-kpis",
          popover: {
            title: "🎯 KPIs Stratégiques",
            description:
              "Suivez vos indicateurs de performance clés : taux de réussite (win rate), revenu prévu, durée moyenne du cycle de vente et valeur du pipeline actuel. Ces métriques vous donnent une vue globale instantanée.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#tour-analytics-revenue",
          popover: {
            title: "💰 Répartition des Revenus",
            description:
              "Visualisez la distribution de vos revenus : deals gagnés (vert), pipeline actuel (bleu) et opportunités perdues (rouge). Comprenez où se trouve votre valeur.",
            side: "top",
            align: "start",
          },
        },
        {
          element: "#tour-analytics-winloss",
          popover: {
            title: "🔍 Analyse Gains & Pertes",
            description:
              "Identifiez les raisons principales de vos victoires et de vos défaites. Capitalisez sur ce qui fonctionne et corrigez ce qui ne marche pas. L'amélioration continue commence ici !",
            side: "top",
            align: "start",
          },
        },
        {
          element: "#tour-analytics-competitors",
          popover: {
            title: "⚔️ Intelligence Concurrentielle",
            description:
              "Analysez face à quels concurrents vous perdez le plus souvent et quelle valeur cela représente. Adaptez votre stratégie en conséquence pour mieux vous positionner.",
            side: "top",
            align: "start",
          },
        },
        {
          popover: {
            title: "📈 Vous êtes maintenant un analyste expert !",
            description:
              "Vous maîtrisez les analytics de OPEx_CRM. Consultez régulièrement ces données pour optimiser vos performances et prendre des décisions éclairées. Data-driven success ! 🎓",
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

    // Callback to mark tour as completed
    const onComplete = () => {
      markTourCompleted(tourName)
      activeTour.value = null
    }

    let tour: ReturnType<typeof driver>

    switch (tourName) {
      case "dashboard":
        tour = dashboardTour(onComplete)
        break
      case "institutions":
        tour = institutionsTour(onComplete)
        break
      case "opportunities":
        tour = opportunitiesTour(onComplete)
        break
      case "analytics":
        tour = analyticsTour(onComplete)
        break
      default:
        return
    }

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
