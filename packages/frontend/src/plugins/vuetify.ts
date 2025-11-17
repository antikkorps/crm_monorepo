/**
 * Vuetify Configuration with Tree-shaking
 *
 * Only imports components that are actually used in the application
 * to reduce bundle size significantly (from ~500KB to ~150KB).
 *
 * Add components here as needed when you use new Vuetify components.
 */

import { createVuetify } from 'vuetify'
import type { ThemeDefinition } from 'vuetify'

// Styles
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

// Components - Only import what we use
import {
  // Layout
  VApp,
  VMain,
  VContainer,
  VRow,
  VCol,
  VSheet,
  VSpacer,
  VDivider,

  // Cards
  VCard,
  VCardTitle,
  VCardSubtitle,
  VCardText,
  VCardActions,
  VCardItem,

  // Buttons & Inputs
  VBtn,
  VBtnGroup,
  VBtnToggle,
  VIcon,
  VTextField,
  VTextarea,
  VSelect,
  VAutocomplete,
  VCombobox,
  VSwitch,
  VCheckbox,
  VRadio,
  VRadioGroup,
  VSlider,

  // Navigation
  VNavigationDrawer,
  VAppBar,
  VAppBarNavIcon,
  VToolbar,
  VToolbarTitle,
  VTabs,
  VTab,
  VWindow,
  VWindowItem,

  // Data Display
  VList,
  VListItem,
  VListItemTitle,
  VListItemSubtitle,
  VListItemAction,
  VListSubheader,
  VListGroup,
  VDataTable,
  VDataTableServer,
  VPagination,
  VChip,
  VChipGroup,
  VBadge,
  VAvatar,
  VImg,
  VTable,

  // Feedback
  VAlert,
  VAlertTitle,
  VDialog,
  VMenu,
  VTooltip,
  VSnackbar,
  VProgressCircular,
  VProgressLinear,
  VSkeletonLoader,
  VOverlay,

  // Forms
  VForm,
  VFileInput,

  // Expansion
  VExpansionPanels,
  VExpansionPanel,
  VExpansionPanelTitle,
  VExpansionPanelText,

  // Other
  VExpandTransition,
  VFadeTransition,
  VSlideXTransition,
} from 'vuetify/components'

// Directives
import {
  Ripple,
  Intersect,
  Resize,
  Scroll,
} from 'vuetify/directives'

// Theme definition
const lightTheme: ThemeDefinition = {
  dark: false,
  colors: {
    primary: '#00695C',
    secondary: '#616161',
    accent: '#4FC3F7',
    error: '#D32F2F',
    info: '#1976D2',
    success: '#388E3C',
    warning: '#FBC02D',
    surface: '#F5F5F5',
    background: '#FFFFFF',
  },
}

const darkTheme: ThemeDefinition = {
  dark: true,
  colors: {
    primary: '#26A69A',
    secondary: '#757575',
    accent: '#81D4FA',
    error: '#EF5350',
    info: '#42A5F5',
    success: '#66BB6A',
    warning: '#FFEE58',
    surface: '#272727',
    background: '#121212',
  },
}

export default createVuetify({
  components: {
    // Layout
    VApp,
    VMain,
    VContainer,
    VRow,
    VCol,
    VSheet,
    VSpacer,
    VDivider,

    // Cards
    VCard,
    VCardTitle,
    VCardSubtitle,
    VCardText,
    VCardActions,
    VCardItem,

    // Buttons & Inputs
    VBtn,
    VBtnGroup,
    VBtnToggle,
    VIcon,
    VTextField,
    VTextarea,
    VSelect,
    VAutocomplete,
    VCombobox,
    VSwitch,
    VCheckbox,
    VRadio,
    VRadioGroup,
    VSlider,

    // Navigation
    VNavigationDrawer,
    VAppBar,
    VAppBarNavIcon,
    VToolbar,
    VToolbarTitle,
    VTabs,
    VTab,
    VWindow,
    VWindowItem,

    // Data Display
    VList,
    VListItem,
    VListItemTitle,
    VListItemSubtitle,
    VListItemAction,
    VListSubheader,
    VListGroup,
    VDataTable,
    VDataTableServer,
    VPagination,
    VChip,
    VChipGroup,
    VBadge,
    VAvatar,
    VImg,
    VTable,

    // Feedback
    VAlert,
    VAlertTitle,
    VDialog,
    VMenu,
    VTooltip,
    VSnackbar,
    VProgressCircular,
    VProgressLinear,
    VSkeletonLoader,
    VOverlay,

    // Forms
    VForm,
    VFileInput,

    // Expansion
    VExpansionPanels,
    VExpansionPanel,
    VExpansionPanelTitle,
    VExpansionPanelText,

    // Transitions
    VExpandTransition,
    VFadeTransition,
    VSlideXTransition,
  },
  directives: {
    Ripple,
    Intersect,
    Resize,
    Scroll,
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      light: lightTheme,
      dark: darkTheme,
    },
  },
  icons: {
    defaultSet: 'mdi',
  },
  defaults: {
    VBtn: {
      variant: 'elevated',
      density: 'default',
    },
    VTextField: {
      variant: 'outlined',
      density: 'compact',
    },
    VTextarea: {
      variant: 'outlined',
      density: 'compact',
    },
    VSelect: {
      variant: 'outlined',
      density: 'compact',
    },
    VAutocomplete: {
      variant: 'outlined',
      density: 'compact',
    },
    VCombobox: {
      variant: 'outlined',
      density: 'compact',
    },
  },
})
