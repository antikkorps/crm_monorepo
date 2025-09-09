<template>
  <AppLayout>
    <div class="medical-institutions-view">
      <!-- Header Section -->
      <div class="page-header">
        <div class="header-content">
          <div class="header-main">
            <div class="title-section">
              <div class="title-icon">
                <v-avatar color="primary" variant="flat" size="56">
                  <v-icon size="28" color="white">mdi-hospital-building</v-icon>
                </v-avatar>
              </div>
              <div class="title-text">
                <h1 class="header-title">{{ t("institutions.title") }}</h1>
                <p class="header-subtitle">
                  {{ t("institutions.subtitle") }}
                </p>
              </div>
            </div>

            <div class="header-actions">
              <v-btn
                variant="outlined"
                prepend-icon="mdi-upload"
                class="action-btn"
                @click="showImportDialog = true"
                >{{ t("institutions.importCSV") }}</v-btn
              >
              <v-btn
                color="primary"
                prepend-icon="mdi-plus"
                variant="elevated"
                class="action-btn primary-btn"
                @click="showCreateDialog = true"
                >{{ t("institutions.addInstitution") }}</v-btn
              >
            </div>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="stats-cards">
          <v-card class="stats-card" variant="tonal">
            <v-card-text class="pa-4">
              <div class="d-flex align-center justify-space-between">
                <div>
                  <div class="text-h5 font-weight-bold">{{ totalRecords }}</div>
                  <div class="text-caption text-medium-emphasis">Total Institutions</div>
                </div>
                <v-icon color="primary" size="32">mdi-hospital-building</v-icon>
              </div>
            </v-card-text>
          </v-card>

          <v-card class="stats-card" variant="tonal" color="success">
            <v-card-text class="pa-4">
              <div class="d-flex align-center justify-space-between">
                <div>
                  <div class="text-h5 font-weight-bold">
                    {{ institutions.filter((i) => i.isActive).length }}
                  </div>
                  <div class="text-caption text-medium-emphasis">Active</div>
                </div>
                <v-icon color="success" size="32">mdi-check-circle</v-icon>
              </div>
            </v-card-text>
          </v-card>

          <v-card class="stats-card" variant="tonal" color="warning">
            <v-card-text class="pa-4">
              <div class="d-flex align-center justify-space-between">
                <div>
                  <div class="text-h5 font-weight-bold">
                    {{
                      institutions.filter(
                        (i) => i.medicalProfile?.complianceStatus === "pending_review"
                      ).length
                    }}
                  </div>
                  <div class="text-caption text-medium-emphasis">Pending Review</div>
                </div>
                <v-icon color="warning" size="32">mdi-clock-alert</v-icon>
              </div>
            </v-card-text>
          </v-card>

          <v-card class="stats-card" variant="tonal" color="error">
            <v-card-text class="pa-4">
              <div class="d-flex align-center justify-space-between">
                <div>
                  <div class="text-h5 font-weight-bold">
                    {{
                      institutions.filter(
                        (i) => i.medicalProfile?.complianceStatus === "non_compliant"
                      ).length
                    }}
                  </div>
                  <div class="text-caption text-medium-emphasis">Non-Compliant</div>
                </div>
                <v-icon color="error" size="32">mdi-alert-circle</v-icon>
              </div>
            </v-card-text>
          </v-card>
        </div>
      </div>

      <!-- Search and Filter Section -->
      <v-card class="filters-card mb-6" variant="outlined">
        <v-card-text class="pa-6">
          <!-- Mobile Search Bar -->
          <div class="mobile-search d-md-none mb-4">
            <v-text-field
              v-model="searchQuery"
              :label="t('institutions.searchInstitutions')"
              prepend-inner-icon="mdi-magnify"
              variant="filled"
              density="comfortable"
              rounded
              clearable
              hide-details="auto"
              @input="onSearchInput"
            />
          </div>

          <!-- Mobile Quick Filters -->
          <div class="mobile-quick-filters d-md-none mb-4">
            <v-select
              v-model="filters.type"
              :items="institutionTypeOptions"
              item-title="label"
              item-value="value"
              :label="t('institutions.type')"
              prepend-inner-icon="mdi-hospital"
              variant="outlined"
              density="compact"
              clearable
              hide-details
              class="mb-3"
              @update:model-value="applyFilters"
            />

            <v-text-field
              v-model="filters.city"
              :label="t('institutions.city')"
              prepend-inner-icon="mdi-map-marker"
              variant="outlined"
              density="compact"
              clearable
              hide-details
              class="mb-3"
              @input="onFilterInput"
            />

            <v-select
              v-model="filters.assignedUserId"
              :items="userOptions"
              item-title="label"
              item-value="value"
              :label="t('institutions.assignedTo')"
              prepend-inner-icon="mdi-account"
              variant="outlined"
              density="compact"
              clearable
              hide-details
              class="mb-3"
              :loading="loadingUsers"
              @update:model-value="applyFilters"
            />

            <v-select
              v-model="filters.complianceStatus"
              :items="complianceStatusOptions"
              item-title="label"
              item-value="value"
              :label="t('institutions.complianceStatus')"
              prepend-inner-icon="mdi-shield-check"
              variant="outlined"
              density="compact"
              clearable
              hide-details
              @update:model-value="applyFilters"
            />
          </div>

          <!-- Desktop Quick Filters Row -->
          <div class="quick-filters mb-4 d-none d-md-flex">
            <v-text-field
              v-model="searchQuery"
              :label="t('institutions.searchInstitutions')"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              clearable
              hide-details
              class="search-field"
              @input="onSearchInput"
            />

            <v-select
              v-model="filters.type"
              :items="institutionTypeOptions"
              item-title="label"
              item-value="value"
              :label="t('institutions.type')"
              prepend-inner-icon="mdi-hospital"
              variant="outlined"
              density="compact"
              clearable
              hide-details
              @update:model-value="applyFilters"
            />

            <v-text-field
              v-model="filters.city"
              :label="t('institutions.city')"
              prepend-inner-icon="mdi-map-marker"
              variant="outlined"
              density="compact"
              clearable
              hide-details
              @input="onFilterInput"
            />

            <v-select
              v-model="filters.assignedUserId"
              :items="userOptions"
              item-title="label"
              item-value="value"
              :label="t('institutions.assignedTo')"
              prepend-inner-icon="mdi-account"
              variant="outlined"
              density="compact"
              clearable
              hide-details
              :loading="loadingUsers"
              @update:model-value="applyFilters"
            />
          </div>

          <!-- Clear Filters Button -->
          <div class="clear-filters-section mb-4">
            <v-btn
              variant="tonal"
              size="small"
              color="error"
              prepend-icon="mdi-filter-off"
              @click="clearFilters"
              class="clear-filters-btn"
              :disabled="!hasActiveFilters"
              >{{ t("institutions.clearFilters") }}</v-btn
            >
          </div>
          <!-- Advanced Filters Toggle -->
          <div class="d-flex align-center justify-space-between">
            <v-btn
              variant="text"
              color="primary"
              @click="showAdvancedFilters = !showAdvancedFilters"
            >
              <v-icon class="mr-2">{{
                showAdvancedFilters ? "mdi-chevron-up" : "mdi-chevron-down"
              }}</v-icon>
              {{
                showAdvancedFilters
                  ? t("institutions.hideAdvancedFilters")
                  : t("institutions.showAdvancedFilters")
              }}
            </v-btn>
          </div>

          <!-- Advanced Filters -->
          <v-expand-transition>
            <div v-if="showAdvancedFilters" class="advanced-filters mt-6 pt-4">
              <v-divider class="mb-4"></v-divider>

              <div class="advanced-filters-grid">
                <!-- Bed Capacity Range -->
                <div class="filter-group">
                  <label class="filter-label">{{ t("institutions.bedCapacity") }}</label>
                  <div class="range-inputs">
                    <v-text-field
                      v-model.number="filters.minBedCapacity"
                      type="number"
                      :label="t('institutions.min')"
                      variant="outlined"
                      density="compact"
                      hide-details
                      @input="onFilterInput"
                    />
                    <span class="range-separator">-</span>
                    <v-text-field
                      v-model.number="filters.maxBedCapacity"
                      type="number"
                      :label="t('institutions.max')"
                      variant="outlined"
                      density="compact"
                      hide-details
                      @input="onFilterInput"
                    />
                  </div>
                </div>

                <!-- Surgical Rooms Range -->
                <div class="filter-group">
                  <label class="filter-label">{{
                    t("institutions.surgicalRooms")
                  }}</label>
                  <div class="range-inputs">
                    <v-text-field
                      v-model.number="filters.minSurgicalRooms"
                      type="number"
                      :label="t('institutions.min')"
                      variant="outlined"
                      density="compact"
                      hide-details
                      @input="onFilterInput"
                    />
                    <span class="range-separator">-</span>
                    <v-text-field
                      v-model.number="filters.maxSurgicalRooms"
                      type="number"
                      :label="t('institutions.max')"
                      variant="outlined"
                      density="compact"
                      hide-details
                      @input="onFilterInput"
                    />
                  </div>
                </div>

                <!-- Specialties Filter -->
                <div class="filter-group">
                  <label class="filter-label">{{ t("institutions.specialties") }}</label>
                  <v-select
                    v-model="filters.specialties"
                    :items="specialtyOptions"
                    item-title="label"
                    item-value="value"
                    :label="t('institutions.specialties')"
                    variant="outlined"
                    density="compact"
                    multiple
                    chips
                    clearable
                    hide-details
                    @update:model-value="applyFilters"
                  />
                </div>

                <!-- Compliance Status Filter -->
                <div class="filter-group">
                  <label class="filter-label">{{
                    t("institutions.complianceStatus")
                  }}</label>
                  <v-select
                    v-model="filters.complianceStatus"
                    :items="complianceStatusOptions"
                    item-title="label"
                    item-value="value"
                    :label="t('institutions.complianceStatus')"
                    variant="outlined"
                    density="compact"
                    clearable
                    hide-details
                    @update:model-value="applyFilters"
                  />
                </div>
              </div>
            </div>
          </v-expand-transition>
        </v-card-text>
      </v-card>

      <!-- Desktop Data Table -->
      <v-card class="data-table-card d-none d-md-block" variant="outlined">
        <v-card-title class="pa-6 pb-2">
          <div class="d-flex align-center justify-space-between">
            <div class="d-flex align-center gap-3">
              <v-icon color="primary">mdi-table</v-icon>
              <div>
                <h2 class="text-h6 font-weight-bold">{{ t("institutions.title") }}</h2>
                <p class="text-body-2 text-medium-emphasis mb-0">
                  {{ totalRecords }} institutions trouvées
                </p>
              </div>
            </div>

            <div class="d-flex gap-2">
              <v-btn
                variant="text"
                prepend-icon="mdi-refresh"
                :loading="loading"
                @click="refreshData"
                >{{ t("institutions.refresh") }}</v-btn
              >
              <v-btn
                variant="tonal"
                prepend-icon="mdi-download"
                color="primary"
                @click="exportData"
                >{{ t("institutions.export") }}</v-btn
              >
            </div>
          </div>
        </v-card-title>

        <v-card-text class="pa-0">
          <v-data-table
            :items="institutions"
            :loading="loading"
            :items-per-page="lazyParams.rows"
            :page="Math.floor(lazyParams.first / lazyParams.rows) + 1"
            :headers="tableHeaders"
            :items-length="totalRecords"
            item-key="id"
            class="elevation-0 enhanced-table"
            @update:page="
              (p) => {
                lazyParams.first = (p - 1) * lazyParams.rows
                loadInstitutions()
              }
            "
          >
            <template #no-data>
              <div class="table-empty-state text-center py-8">
                <div class="empty-icon-container">
                  <v-icon size="48" class="mb-3 empty-icon">mdi-domain</v-icon>
                </div>
                <div class="text-subtitle-1 mb-2 empty-title">
                  {{ t("institutions.noInstitutionsFound") }}
                </div>
                <div class="text-body-2 empty-subtitle">
                  {{ t("institutions.adjustSearchOrAdd") }}
                </div>
              </div>
            </template>

            <template #item.name="{ item }">
              <div class="d-flex align-center py-2">
                <v-avatar
                  size="40"
                  class="mr-3"
                  :color="getInstitutionColor(item.type)"
                  variant="tonal"
                >
                  <v-icon size="20">{{ getInstitutionIcon(item.type) }}</v-icon>
                </v-avatar>
                <div>
                  <div class="text-subtitle-2 font-weight-medium">{{ item.name }}</div>
                  <v-chip
                    size="x-small"
                    variant="tonal"
                    :color="getInstitutionColor(item.type)"
                  >
                    {{ formatInstitutionType(item.type) }}
                  </v-chip>
                </div>
              </div>
            </template>

            <template #item.location="{ item }">
              <div class="d-flex align-center">
                <v-icon size="16" class="mr-2 text-medium-emphasis"
                  >mdi-map-marker</v-icon
                >
                <div>
                  <div class="text-body-2 font-weight-medium">
                    {{ item.address.city }}, {{ item.address.state }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    {{ item.address.country }}
                  </div>
                </div>
              </div>
            </template>

            <template #item.profile="{ item }">
              <div v-if="item.medicalProfile" class="medical-profile">
                <div class="d-flex gap-3 mb-2">
                  <div v-if="item.medicalProfile?.bedCapacity" class="profile-stat">
                    <v-chip
                      size="small"
                      variant="tonal"
                      color="info"
                      prepend-icon="mdi-bed"
                    >
                      {{ item.medicalProfile?.bedCapacity }} {{ t("institutions.beds") }}
                    </v-chip>
                  </div>
                  <div v-if="item.medicalProfile?.surgicalRooms" class="profile-stat">
                    <v-chip
                      size="small"
                      variant="tonal"
                      color="success"
                      prepend-icon="mdi-medical-bag"
                    >
                      {{ item.medicalProfile?.surgicalRooms }} {{ t("institutions.or") }}
                    </v-chip>
                  </div>
                </div>
                <div class="specialties-container">
                  <v-chip
                    v-for="sp in (item.medicalProfile?.specialties || []).slice(0, 2)"
                    :key="sp"
                    size="x-small"
                    class="mr-1 mb-1"
                    variant="outlined"
                    >{{ sp }}</v-chip
                  >
                  <v-tooltip
                    v-if="(item.medicalProfile?.specialties || []).length > 2"
                    location="top"
                  >
                    <template #activator="{ props }">
                      <v-chip
                        v-bind="props"
                        size="x-small"
                        variant="tonal"
                        color="primary"
                      >
                        +{{ (item.medicalProfile?.specialties || []).length - 2 }}
                      </v-chip>
                    </template>
                    <div>
                      <div
                        v-for="sp in (item.medicalProfile?.specialties || []).slice(2)"
                        :key="sp"
                      >
                        {{ sp }}
                      </div>
                    </div>
                  </v-tooltip>
                </div>
              </div>
              <div v-else class="text-caption text-medium-emphasis d-flex align-center">
                <v-icon size="16" class="mr-1">mdi-information-outline</v-icon>
                {{ t("institutions.noMedicalProfile") }}
              </div>
            </template>

            <template #item.status="{ item }">
              <div class="d-flex flex-column gap-1">
                <v-chip
                  v-if="item.medicalProfile"
                  :color="getComplianceSeverity(item.medicalProfile.complianceStatus)"
                  variant="tonal"
                  size="small"
                  :prepend-icon="getComplianceIcon(item.medicalProfile.complianceStatus)"
                >
                  {{ formatComplianceStatus(item.medicalProfile.complianceStatus) }}
                </v-chip>
                <v-chip
                  v-else
                  variant="tonal"
                  color="warning"
                  size="small"
                  prepend-icon="mdi-alert"
                >
                  {{ t("institutions.noProfile") }}
                </v-chip>
                <v-chip
                  :color="item.isActive ? 'success' : 'error'"
                  variant="flat"
                  size="small"
                  :prepend-icon="item.isActive ? 'mdi-check-circle' : 'mdi-close-circle'"
                >
                  {{
                    item.isActive ? t("institutions.active") : t("institutions.inactive")
                  }}
                </v-chip>
              </div>
            </template>

            <template #item.actions="{ item }">
              <div class="actions-container">
                <v-btn-group variant="tonal" density="compact">
                  <v-btn icon="mdi-eye" size="small" @click="viewInstitution(item)">
                    <v-icon>mdi-eye</v-icon>
                    <v-tooltip activator="parent" location="top">Voir</v-tooltip>
                  </v-btn>
                  <v-btn icon="mdi-pencil" size="small" @click="editInstitution(item)">
                    <v-icon>mdi-pencil</v-icon>
                    <v-tooltip activator="parent" location="top">Modifier</v-tooltip>
                  </v-btn>
                  <v-btn
                    icon="mdi-delete"
                    color="error"
                    size="small"
                    @click="confirmDelete(item)"
                  >
                    <v-icon>mdi-delete</v-icon>
                    <v-tooltip activator="parent" location="top">Supprimer</v-tooltip>
                  </v-btn>
                </v-btn-group>
              </div>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>

      <!-- Mobile Cards List -->
      <div class="mobile-cards-container d-md-none">
        <div class="mobile-header mb-4">
          <div class="d-flex align-center justify-space-between">
            <div>
              <h2 class="text-h6 font-weight-bold">{{ totalRecords }} institutions</h2>
              <p class="text-caption text-medium-emphasis mb-0">
                Glisser pour plus d'actions
              </p>
            </div>
            <div class="d-flex gap-1">
              <v-btn
                icon="mdi-refresh"
                variant="text"
                size="small"
                :loading="loading"
                @click="refreshData"
              />
              <v-btn
                icon="mdi-download"
                variant="text"
                color="primary"
                size="small"
                @click="exportData"
              />
            </div>
          </div>
        </div>

        <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />

        <div v-if="!loading && institutions.length === 0" class="empty-state">
          <div class="text-center py-8">
            <v-icon size="64" class="mb-4" color="surface-variant">mdi-domain</v-icon>
            <h3 class="text-h6 mb-2">{{ t("institutions.noInstitutionsFound") }}</h3>
            <p class="text-body-2 text-medium-emphasis">
              {{ t("institutions.adjustSearchOrAdd") }}
            </p>
          </div>
        </div>

        <div class="mobile-cards-list">
          <v-card
            v-for="institution in institutions"
            :key="institution.id"
            class="institution-card mb-3"
            variant="outlined"
            @click="viewInstitution(institution)"
          >
            <v-card-text class="pa-4">
              <div class="institution-card-content">
                <div class="institution-header">
                  <div class="institution-avatar">
                    <v-avatar
                      size="52"
                      :color="getInstitutionColor(institution.type)"
                      variant="tonal"
                    >
                      <v-icon size="26">{{
                        getInstitutionIcon(institution.type)
                      }}</v-icon>
                    </v-avatar>
                  </div>
                  <div class="institution-main-info">
                    <h3 class="institution-name">{{ institution.name }}</h3>
                    <div class="institution-meta">
                      <v-chip
                        size="x-small"
                        variant="tonal"
                        :color="getInstitutionColor(institution.type)"
                      >
                        {{ formatInstitutionType(institution.type) }}
                      </v-chip>
                      <span class="location-info">
                        <v-icon size="12" class="mr-1">mdi-map-marker</v-icon>
                        {{ institution.address.city }}, {{ institution.address.state }}
                      </span>
                    </div>
                  </div>
                  <div class="institution-status">
                    <v-chip
                      :color="institution.isActive ? 'success' : 'error'"
                      variant="flat"
                      size="small"
                      :prepend-icon="
                        institution.isActive ? 'mdi-check-circle' : 'mdi-close-circle'
                      "
                    >
                      {{
                        institution.isActive
                          ? t("institutions.active")
                          : t("institutions.inactive")
                      }}
                    </v-chip>
                  </div>
                </div>

                <div v-if="institution.medicalProfile" class="medical-details">
                  <div class="medical-stats-modern">
                    <div v-if="institution.medicalProfile.bedCapacity" class="modern-stat-item beds">
                      <div class="stat-icon-wrapper">
                        <v-icon size="16" class="stat-icon">mdi-bed</v-icon>
                      </div>
                      <div class="stat-content">
                        <div class="stat-value">{{ institution.medicalProfile.bedCapacity }}</div>
                        <div class="stat-label">{{ t("institutions.beds") }}</div>
                      </div>
                    </div>
                    
                    <div v-if="institution.medicalProfile.surgicalRooms" class="modern-stat-item surgery">
                      <div class="stat-icon-wrapper">
                        <v-icon size="16" class="stat-icon">mdi-medical-bag</v-icon>
                      </div>
                      <div class="stat-content">
                        <div class="stat-value">{{ institution.medicalProfile.surgicalRooms }}</div>
                        <div class="stat-label">{{ t("institutions.or") }}</div>
                      </div>
                    </div>
                    
                    <div class="modern-stat-item compliance" :class="getComplianceSeverity(institution.medicalProfile.complianceStatus)">
                      <div class="stat-icon-wrapper">
                        <v-icon size="16" class="stat-icon">mdi-shield-check</v-icon>
                      </div>
                      <div class="stat-content">
                        <div class="stat-value">{{ formatComplianceStatus(institution.medicalProfile.complianceStatus) }}</div>
                        <div class="stat-label">{{ t("institutions.compliance") }}</div>
                      </div>
                    </div>
                  </div>

                  <div
                    v-if="institution.medicalProfile.specialties?.length"
                    class="specialties-section-modern"
                  >
                    <div class="specialties-header">
                      <v-icon size="14" class="specialty-icon">mdi-stethoscope</v-icon>
                      <span class="specialties-title">{{ t("institutions.specialties") }}</span>
                    </div>
                    <div class="specialties-chips-modern">
                      <v-chip
                        v-for="specialty in (
                          institution.medicalProfile.specialties || []
                        ).slice(0, 2)"
                        :key="specialty"
                        size="x-small"
                        variant="flat"
                        color="primary"
                        class="modern-specialty-chip"
                      >
                        {{ specialty }}
                      </v-chip>
                      <v-chip
                        v-if="(institution.medicalProfile.specialties || []).length > 2"
                        size="x-small"
                        variant="tonal"
                        color="primary"
                        class="more-chip"
                      >
                        +{{ (institution.medicalProfile.specialties || []).length - 2 }}
                      </v-chip>
                    </div>
                  </div>
                </div>

                <div class="card-action">
                  <v-btn
                    variant="text"
                    size="small"
                    color="primary"
                    append-icon="mdi-chevron-right"
                  >
                    {{ t("common.viewDetails") }}
                  </v-btn>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </div>

        <!-- Mobile Pagination -->
        <div v-if="totalRecords > lazyParams.rows" class="mobile-pagination mt-4">
          <v-pagination
            :model-value="Math.floor(lazyParams.first / lazyParams.rows) + 1"
            :length="Math.ceil(totalRecords / lazyParams.rows)"
            :total-visible="3"
            @update:model-value="
              (p) => {
                lazyParams.first = (p - 1) * lazyParams.rows
                loadInstitutions()
              }
            "
          />
        </div>
      </div>

      <!-- Create Institution Dialog (Vuetify) -->
      <v-dialog v-model="showCreateDialog" max-width="900">
        <v-card>
          <v-card-title>{{ t("institutions.addNewInstitution") }}</v-card-title>
          <v-card-text>
            <MedicalInstitutionForm
              @institution-saved="onInstitutionCreated"
              @cancel="showCreateDialog = false"
            />
          </v-card-text>
        </v-card>
      </v-dialog>

      <!-- Import CSV Dialog (Vuetify) -->
      <ImportInstitutionsDialog
        v-model="showImportDialog"
        @completed="onImportCompleted"
      />

      <!-- Delete Confirmation Dialog (Vuetify) -->
      <v-dialog v-model="confirmVisible" max-width="420">
        <v-card>
          <v-card-title>{{ t("institutions.deleteConfirmation") }}</v-card-title>
          <v-card-text>{{ confirmMessage }}</v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn variant="text" @click="confirmVisible = false">{{
              t("common.cancel")
            }}</v-btn>
            <v-btn color="error" @click="confirmAccept">{{ t("common.delete") }}</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Snackbar notifications -->
      <v-snackbar v-model="snackbar.visible" :color="snackbar.color" timeout="3000">
        {{ snackbar.message }}
      </v-snackbar>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import ImportInstitutionsDialog from "@/components/institutions/ImportInstitutionsDialog.vue"
import MedicalInstitutionForm from "@/components/institutions/MedicalInstitutionFormVuetify.vue"
import AppLayout from "@/components/layout/AppLayout.vue"
import { institutionsApi, usersApi } from "@/services/api"
import type {
  ComplianceStatus,
  InstitutionType,
  MedicalInstitution,
  MedicalInstitutionSearchFilters,
} from "@medical-crm/shared"
// Using Vuetify components globally; no PrimeVue imports
import { computed, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

const router = useRouter()
const { t } = useI18n()
// Local snackbar + confirm state (Vuetify)
const snackbar = ref<{ visible: boolean; color: string; message: string }>({
  visible: false,
  color: "info",
  message: "",
})
const showSnackbar = (message: string, color: string = "info") => {
  snackbar.value = { visible: true, color, message }
}
const confirmVisible = ref(false)
const confirmMessage = ref("")
const confirmTarget = ref<MedicalInstitution | null>(null)
const confirmAccept = () => {
  confirmVisible.value = false
  if (confirmTarget.value) {
    void deleteInstitution(confirmTarget.value)
  }
}

const onImportCompleted = () => {
  showImportDialog.value = false
  showSnackbar(t("institutions.importCompleted"), "success")
  loadInstitutions()
}

// Reactive data
const institutions = ref<MedicalInstitution[]>([])
const selectedInstitutions = ref<MedicalInstitution[]>([])
const loading = ref(false)
const totalRecords = ref(0)
const searchQuery = ref("")
const showAdvancedFilters = ref(false)
const showCreateDialog = ref(false)
const showImportDialog = ref(false)

// Pagination and sorting
const lazyParams = ref({
  first: 0,
  rows: 20,
  sortField: "name",
  sortOrder: 1,
})

// Filters
const filters = ref<MedicalInstitutionSearchFilters>({
  name: "",
  type: undefined,
  city: "",
  assignedUserId: undefined,
  minBedCapacity: undefined,
  maxBedCapacity: undefined,
  minSurgicalRooms: undefined,
  maxSurgicalRooms: undefined,
  specialties: [],
  complianceStatus: undefined,
})

// Filter options
const institutionTypeOptions = computed(() => [
  { label: t("institutions.institutionTypes.hospital"), value: "hospital" },
  { label: t("institutions.institutionTypes.clinic"), value: "clinic" },
  { label: t("institutions.institutionTypes.medicalCenter"), value: "medical_center" },
  {
    label: t("institutions.institutionTypes.specialtyClinic"),
    value: "specialty_clinic",
  },
])

const complianceStatusOptions = computed(() => [
  { label: t("institutions.complianceStatuses.compliant"), value: "compliant" },
  { label: t("institutions.complianceStatuses.nonCompliant"), value: "non_compliant" },
  { label: t("institutions.complianceStatuses.pendingReview"), value: "pending_review" },
  { label: t("institutions.complianceStatuses.expired"), value: "expired" },
])

const specialtyOptions = computed(() => [
  { label: t("institutions.specialtiesList.cardiology"), value: "cardiology" },
  { label: t("institutions.specialtiesList.neurology"), value: "neurology" },
  { label: t("institutions.specialtiesList.orthopedics"), value: "orthopedics" },
  { label: t("institutions.specialtiesList.pediatrics"), value: "pediatrics" },
  { label: t("institutions.specialtiesList.oncology"), value: "oncology" },
  {
    label: t("institutions.specialtiesList.emergencyMedicine"),
    value: "emergency_medicine",
  },
  { label: t("institutions.specialtiesList.surgery"), value: "surgery" },
  {
    label: t("institutions.specialtiesList.internalMedicine"),
    value: "internal_medicine",
  },
])

const userOptions = ref<Array<{ label: string; value: string }>>([])
const loadingUsers = ref(false)

// Computed properties
const hasActiveFilters = computed(() => {
  return !!(
    searchQuery.value ||
    filters.value.type ||
    filters.value.city ||
    filters.value.assignedUserId ||
    filters.value.complianceStatus ||
    filters.value.minBedCapacity ||
    filters.value.maxBedCapacity ||
    filters.value.minSurgicalRooms ||
    filters.value.maxSurgicalRooms ||
    filters.value.specialties?.length
  )
})

const activeFilters = computed(() => {
  const active: MedicalInstitutionSearchFilters = {}
  if (searchQuery.value) active.name = searchQuery.value
  if (filters.value.type) active.type = filters.value.type
  if (filters.value.city) active.city = filters.value.city
  if (filters.value.assignedUserId) active.assignedUserId = filters.value.assignedUserId
  if (filters.value.minBedCapacity) active.minBedCapacity = filters.value.minBedCapacity
  if (filters.value.maxBedCapacity) active.maxBedCapacity = filters.value.maxBedCapacity
  if (filters.value.minSurgicalRooms)
    active.minSurgicalRooms = filters.value.minSurgicalRooms
  if (filters.value.maxSurgicalRooms)
    active.maxSurgicalRooms = filters.value.maxSurgicalRooms
  if (filters.value.specialties?.length) active.specialties = filters.value.specialties
  if (filters.value.complianceStatus)
    active.complianceStatus = filters.value.complianceStatus
  return active
})

// Methods
const loadUsers = async () => {
  if (loadingUsers.value) return
  loadingUsers.value = true
  try {
    const response = await usersApi.getAll({ limit: 100 }) // Get first 100 users
    const payload: any = response
    
    // Handle different API response structures
    let users = []
    if (payload?.success && payload.data) {
      users = payload.data.users || payload.data || []
    } else if (Array.isArray(payload)) {
      users = payload
    } else if (payload?.data) {
      users = Array.isArray(payload.data) ? payload.data : []
    }
    
    userOptions.value = users.map((user: any) => ({
      label: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      value: user.id || user._id
    }))
  } catch (error) {
    console.error("Error loading users:", error)
    // Keep empty array on error, don't show error to user as this is not critical
  } finally {
    loadingUsers.value = false
  }
}

const loadInstitutions = async () => {
  loading.value = true
  try {
    const params = {
      ...activeFilters.value,
      page: Math.floor(lazyParams.value.first / lazyParams.value.rows) + 1,
      limit: lazyParams.value.rows,
      sortBy: lazyParams.value.sortField,
      sortOrder: lazyParams.value.sortOrder === 1 ? "asc" : "desc",
    }

    const response = await institutionsApi.getAll(params)
    const payload: any = response
    // Support both old and new backend shapes
    if (payload?.success && payload.data) {
      institutions.value = payload.data.institutions || []
      totalRecords.value = payload.data.pagination?.total || payload.data.total || 0
    } else {
      institutions.value = payload.data || []
      totalRecords.value = payload.meta?.total || 0
    }
  } catch (error) {
    console.error("Error loading institutions:", error)
    showSnackbar(t("institutions.failedToLoad"), "error")
  } finally {
    loading.value = false
  }
}

const onPage = (event: any) => {
  lazyParams.value.first = event.first
  lazyParams.value.rows = event.rows
  loadInstitutions()
}

const onSort = (event: any) => {
  lazyParams.value.sortField = event.sortField
  lazyParams.value.sortOrder = event.sortOrder
  loadInstitutions()
}

const onSearchInput = () => {
  // Debounce search input
  clearTimeout(searchTimeout.value)
  searchTimeout.value = setTimeout(() => {
    applyFilters()
  }, 500)
}

const searchTimeout = ref<ReturnType<typeof setTimeout> | undefined>()

const onFilterInput = () => {
  // Debounce filter input
  clearTimeout(filterTimeout.value)
  filterTimeout.value = setTimeout(() => {
    applyFilters()
  }, 800)
}

const filterTimeout = ref<ReturnType<typeof setTimeout> | undefined>()

const applyFilters = () => {
  lazyParams.value.first = 0 // Reset to first page
  loadInstitutions()
}

const clearFilters = () => {
  searchQuery.value = ""
  filters.value = {
    name: "",
    type: undefined,
    city: "",
    assignedUserId: undefined,
    minBedCapacity: undefined,
    maxBedCapacity: undefined,
    minSurgicalRooms: undefined,
    maxSurgicalRooms: undefined,
    specialties: [],
    complianceStatus: undefined,
  }
  applyFilters()
}

const refreshData = () => {
  loadInstitutions()
}

const exportData = () => {
  // Export functionality to be implemented
  showSnackbar(t("institutions.exportComingSoon"), "info")
}

const viewInstitution = (institution: MedicalInstitution) => {
  router.push(`/institutions/${institution.id}`)
}

const editInstitution = (institution: MedicalInstitution) => {
  router.push(`/institutions/${institution.id}`)
}

const confirmDelete = (institution: MedicalInstitution) => {
  confirmMessage.value = t("institutions.deleteConfirmMessage", {
    name: institution.name,
  })
  confirmTarget.value = institution
  confirmVisible.value = true
}

const deleteInstitution = async (institution: MedicalInstitution) => {
  try {
    await institutionsApi.delete(institution.id)
    showSnackbar(
      t("institutions.institutionDeleted", { name: institution.name }),
      "success"
    )
    loadInstitutions()
  } catch (error) {
    console.error("Error deleting institution:", error)
    showSnackbar(t("institutions.failedToDelete"), "error")
  }
}

const onInstitutionCreated = (newInstitution: MedicalInstitution) => {
  showCreateDialog.value = false
  loadInstitutions() // Refresh the list
  showSnackbar(
    t("institutions.institutionCreated", { name: newInstitution.name }),
    "success"
  )
}

// Utility functions
const formatInstitutionType = (type: InstitutionType): string => {
  const typeMap = {
    hospital: t("institutions.institutionTypes.hospital"),
    clinic: t("institutions.institutionTypes.clinic"),
    medical_center: t("institutions.institutionTypes.medicalCenter"),
    specialty_clinic: t("institutions.institutionTypes.specialtyClinic"),
  }
  return typeMap[type] || type
}

const formatComplianceStatus = (status: ComplianceStatus): string => {
  const statusMap = {
    compliant: t("institutions.complianceStatuses.compliant"),
    non_compliant: t("institutions.complianceStatuses.nonCompliant"),
    pending_review: t("institutions.complianceStatuses.pendingReview"),
    expired: t("institutions.complianceStatuses.expired"),
  }
  return statusMap[status] || status
}

const getComplianceSeverity = (status: ComplianceStatus): string => {
  const severityMap = {
    compliant: "success",
    non_compliant: "danger",
    pending_review: "warning",
    expired: "danger",
  }
  return severityMap[status] || "secondary"
}

const getInstitutionColor = (type: InstitutionType): string => {
  const colorMap = {
    hospital: "primary",
    clinic: "success",
    medical_center: "warning",
    specialty_clinic: "secondary",
  }
  return colorMap[type] || "surface"
}

const getInstitutionIcon = (type: InstitutionType): string => {
  const iconMap = {
    hospital: "mdi-hospital-building",
    clinic: "mdi-medical-bag",
    medical_center: "mdi-hospital",
    specialty_clinic: "mdi-stethoscope",
  }
  return iconMap[type] || "mdi-domain"
}

const getComplianceIcon = (status: ComplianceStatus): string => {
  const iconMap = {
    compliant: "mdi-check-circle",
    non_compliant: "mdi-close-circle",
    pending_review: "mdi-clock-alert",
    expired: "mdi-alert-circle",
  }
  return iconMap[status] || "mdi-help-circle"
}

const toggleTypeFilter = (type: string) => {
  filters.value.type = filters.value.type === type ? undefined : (type as InstitutionType)
  applyFilters()
}

// Vuetify data-table headers
const tableHeaders = computed(
  () =>
    [
      {
        title: t("institutions.tableHeaders.institution"),
        value: "name",
        sortable: false,
      },
      {
        title: t("institutions.tableHeaders.location"),
        value: "location",
        sortable: false,
      },
      {
        title: t("institutions.tableHeaders.medicalProfile"),
        value: "profile",
        sortable: false,
      },
      { title: t("institutions.tableHeaders.status"), value: "status", sortable: false },
      {
        title: t("institutions.tableHeaders.actions"),
        value: "actions",
        sortable: false,
        align: "end" as const,
      },
    ] as const
)

// Lifecycle
onMounted(() => {
  loadInstitutions()
  loadUsers()
})

// Watch for filter changes
watch(
  activeFilters,
  () => {
    // Filters are applied through user interactions
  },
  { deep: true }
)
</script>

<style scoped>
.medical-institutions-view {
  padding: 1rem;
  max-width: 100%;
  background: rgb(var(--v-theme-surface));
}

/* Header Styles */
.page-header {
  margin-bottom: 2rem;
}

.header-content {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: linear-gradient(
    135deg,
    rgba(var(--v-theme-primary), 0.08) 0%,
    rgba(var(--v-theme-secondary), 0.04) 100%
  );
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
  border-radius: 20px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(var(--v-theme-primary), 0.12);
  position: relative;
  overflow: hidden;
}

.header-content::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(
    circle at top right,
    rgba(var(--v-theme-primary), 0.05) 0%,
    transparent 50%
  );
  z-index: -1;
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
  min-height: 120px;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex: 1;
}

.title-icon {
  flex-shrink: 0;
}

.title-text {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}

.header-title {
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.2;
  margin: 0;
  color: rgb(var(--v-theme-on-surface));
}

.header-subtitle {
  font-size: 1rem;
  line-height: 1.4;
  margin: 0;
  color: rgb(var(--v-theme-on-surface-variant));
  opacity: 0.9;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}

.action-btn {
  height: 44px;
  font-weight: 600;
  text-transform: none;
  letter-spacing: normal;
}

.primary-btn {
  box-shadow: 0 4px 12px rgba(var(--v-theme-primary), 0.3);
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.stats-card {
  border-radius: 12px;
  transition: all 0.3s ease;
  border: 1px solid rgba(var(--v-theme-outline), 0.12);
}

.stats-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

/* Filters Styles */
.filters-card {
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(var(--v-theme-outline), 0.12);
}

.quick-filters {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 1rem;
  align-items: end;
}

.mobile-search {
  max-width: 100%;
}

/* Mobile Filters Styles */
.mobile-quick-filters {
  background: linear-gradient(135deg, 
    rgba(var(--v-theme-surface), 0.98) 0%, 
    rgba(var(--v-theme-primary), 0.015) 50%,
    rgba(var(--v-theme-surface), 0.95) 100%
  );
  border-radius: 16px;
  padding: 1.25rem;
  border: 1px solid rgba(var(--v-theme-primary), 0.08);
  box-shadow: 
    0 2px 12px rgba(var(--v-theme-primary), 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  position: relative;
}

.mobile-quick-filters::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at top left, rgba(var(--v-theme-primary), 0.02) 0%, transparent 50%);
  border-radius: 16px;
  z-index: -1;
}

/* Clear Filters Button Styling */
.clear-filters-section {
  display: flex;
  justify-content: center;
  padding: 1rem;
  background: linear-gradient(135deg, 
    rgba(var(--v-theme-error), 0.04) 0%, 
    rgba(var(--v-theme-surface), 0.98) 50%,
    rgba(var(--v-theme-error), 0.02) 100%
  );
  border-radius: 12px;
  border: 1px solid rgba(var(--v-theme-error), 0.12);
  backdrop-filter: blur(8px);
  position: relative;
}

.clear-filters-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at center, rgba(var(--v-theme-error), 0.02) 0%, transparent 70%);
  border-radius: 12px;
  z-index: -1;
}

.clear-filters-btn {
  font-weight: 600;
  letter-spacing: 0.5px;
  min-width: 160px;
  height: 40px;
  box-shadow: 0 2px 8px rgba(var(--v-theme-error), 0.15);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  z-index: 1;
}

.clear-filters-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--v-theme-error), 0.25);
}

.clear-filters-btn:active {
  transform: translateY(0);
  transition-duration: 0.1s;
}

.clear-filters-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

.mobile-cards-container {
  margin-bottom: 1rem;
}

.mobile-header {
  background: rgba(var(--v-theme-surface), 0.8);
  backdrop-filter: blur(10px);
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid rgba(var(--v-theme-outline), 0.12);
}

/* Mobile Institution Cards */
.institution-card {
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  background: rgba(var(--v-theme-surface), 0.95);
  backdrop-filter: blur(8px);
}

.institution-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(var(--v-theme-primary), 0.15);
  border-color: rgba(var(--v-theme-primary), 0.5);
}

.institution-card:active {
  transform: translateY(0);
  transition-duration: 0.1s;
}

.institution-card-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.institution-header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 1rem;
  align-items: start;
}

.institution-avatar {
  flex-shrink: 0;
}

.institution-main-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.institution-name {
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.3;
  margin: 0;
  color: rgb(var(--v-theme-on-surface));
  word-break: break-word;
}

.institution-meta {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.location-info {
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface-variant));
  display: flex;
  align-items: center;
}

.institution-status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.medical-details {
  background: linear-gradient(135deg, 
    rgba(var(--v-theme-surface), 0.95) 0%, 
    rgba(var(--v-theme-primary), 0.02) 50%,
    rgba(var(--v-theme-surface), 0.90) 100%
  );
  border-radius: 16px;
  padding: 1.25rem;
  border: 1px solid rgba(var(--v-theme-primary), 0.08);
  backdrop-filter: blur(10px);
  position: relative;
}

.medical-details::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at top right, rgba(var(--v-theme-primary), 0.03) 0%, transparent 50%);
  border-radius: 16px;
  z-index: -1;
}

.medical-stats-modern {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.modern-stat-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  background: rgba(var(--v-theme-surface), 0.8);
  border-radius: 12px;
  padding: 0.75rem;
  border: 1px solid transparent;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.modern-stat-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 3px;
  height: 100%;
  background: currentColor;
  opacity: 0.3;
  transition: all 0.3s ease;
}

.modern-stat-item.beds {
  color: rgb(var(--v-theme-info));
}

.modern-stat-item.surgery {
  color: rgb(var(--v-theme-success));
}

.modern-stat-item.compliance.success {
  color: rgb(var(--v-theme-success));
}

.modern-stat-item.compliance.warning {
  color: rgb(var(--v-theme-warning));
}

.modern-stat-item.compliance.danger {
  color: rgb(var(--v-theme-error));
}

.stat-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(currentColor, 0.1);
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.stat-icon {
  color: currentColor !important;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.stat-value {
  font-size: 0.875rem;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
  line-height: 1;
}

.stat-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface-variant), 0.8);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  line-height: 1;
}

.specialties-section-modern {
  border-top: 1px solid rgba(var(--v-theme-outline), 0.08);
  padding-top: 1rem;
}

.specialties-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.specialty-icon {
  color: rgba(var(--v-theme-primary), 0.7) !important;
}

.specialties-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface-variant));
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.specialties-chips-modern {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.modern-specialty-chip {
  backdrop-filter: blur(8px);
  box-shadow: 0 1px 3px rgba(var(--v-theme-primary), 0.1);
}

.more-chip {
  background: rgba(var(--v-theme-primary), 0.08) !important;
  font-weight: 600;
}

.card-action {
  display: flex;
  justify-content: flex-end;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(var(--v-theme-outline), 0.08);
}

.mobile-pagination {
  display: flex;
  justify-content: center;
}

/* Enhanced Empty State */
.empty-state {
  background: linear-gradient(135deg, 
    rgba(var(--v-theme-surface-variant), 0.4) 0%, 
    rgba(var(--v-theme-surface), 0.8) 50%,
    rgba(var(--v-theme-surface-variant), 0.3) 100%
  );
  border-radius: 20px;
  border: 2px dashed rgba(var(--v-theme-primary), 0.15);
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(var(--v-theme-surface-variant), 0.2);
}

.empty-state::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle at center, rgba(var(--v-theme-primary), 0.03) 0%, transparent 50%);
  animation: float 6s ease-in-out infinite;
  z-index: -1;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  50% { transform: translate(-10px, -10px) rotate(5deg); }
}

.empty-state .text-h6 {
  color: rgb(var(--v-theme-on-surface));
  font-weight: 600;
}

.empty-state .text-body-2 {
  color: rgba(var(--v-theme-on-surface-variant), 0.8);
}

.empty-state .v-icon {
  color: rgba(var(--v-theme-primary), 0.6) !important;
}

/* Table Empty State */
.table-empty-state {
  padding: 3rem 2rem;
  background: linear-gradient(135deg, 
    rgba(var(--v-theme-surface-variant), 0.2) 0%, 
    rgba(var(--v-theme-surface), 0.95) 100%
  );
  border-radius: 16px;
  margin: 2rem;
  position: relative;
}

.empty-icon-container {
  position: relative;
  display: inline-block;
}

.empty-icon {
  color: rgba(var(--v-theme-primary), 0.4) !important;
  background: rgba(var(--v-theme-primary), 0.08);
  border-radius: 50%;
  padding: 1rem;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { 
    transform: scale(1);
    opacity: 0.4;
  }
  50% { 
    transform: scale(1.05);
    opacity: 0.6;
  }
}

.empty-title {
  color: rgb(var(--v-theme-on-surface));
  font-weight: 600;
}

.empty-subtitle {
  color: rgba(var(--v-theme-on-surface-variant), 0.8);
  max-width: 400px;
  margin: 0 auto;
  line-height: 1.5;
}

/* Enhanced table styles */
.enhanced-table :deep(.v-data-table__wrapper) {
  border-radius: 0 0 16px 16px;
}

.enhanced-table :deep(.v-data-table-header) {
  background: rgba(var(--v-theme-surface-variant), 0.5);
}

.enhanced-table :deep(.v-data-table-header th) {
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  border-bottom: 2px solid rgba(var(--v-theme-primary), 0.2);
}

.enhanced-table :deep(.v-data-table__tr:hover) {
  background: rgba(var(--v-theme-primary), 0.04);
}

.enhanced-table :deep(.v-data-table__td) {
  padding: 16px 12px;
  vertical-align: top;
}

.search-field {
  min-width: 280px;
}

.advanced-filters {
  background: rgba(var(--v-theme-surface), 0.5);
  border-radius: 12px;
  padding: 1rem;
}

.advanced-filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  margin-bottom: 0.25rem;
}

.range-inputs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.range-separator {
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  padding: 0 0.5rem;
}

/* Data Table Styles */
.data-table-card {
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(var(--v-theme-outline), 0.12);
  overflow: hidden;
}

.medical-profile {
  max-width: 280px;
}

.profile-stat {
  margin-bottom: 0.25rem;
}

.specialties-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  max-width: 200px;
}

.actions-container {
  display: flex;
  justify-content: center;
}

/* Responsive Design */
@media (max-width: 1200px) {
  .stats-cards {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }

  .quick-filters {
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .search-field {
    min-width: unset;
    grid-column: 1 / -1;
  }

  .enhanced-table :deep(.v-data-table__td) {
    padding: 12px 8px;
  }
}

@media (max-width: 960px) {
  .medical-institutions-view {
    padding: 0.75rem;
  }

  .header-content {
    padding: 1.25rem;
    margin-bottom: 1.5rem;
  }

  .header-main {
    flex-direction: column;
    align-items: center;
    gap: 1.75rem;
    text-align: center;
    min-height: auto;
  }

  .title-section {
    justify-content: center;
    text-align: center;
    gap: 1.25rem;
  }

  .title-text {
    text-align: center;
  }

  .header-actions {
    justify-content: center;
    flex-wrap: wrap;
    width: 100%;
  }

  .header-actions {
    width: 100%;
    justify-content: center;
  }

  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .quick-filters {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .advanced-filters-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .medical-profile {
    max-width: none;
  }

  .specialties-container {
    max-width: none;
  }
}

@media (max-width: 600px) {
  .medical-institutions-view {
    padding: 0.5rem;
  }

  .header-content {
    padding: 1rem;
    margin-bottom: 1.25rem;
    border-radius: 16px;
  }

  .header-main {
    gap: 1.5rem;
    min-height: auto;
  }

  .title-section {
    gap: 1rem;
    flex-direction: column;
    align-items: center;
  }

  .title-icon {
    order: -1;
  }

  .header-title {
    font-size: 1.5rem;
    text-align: center;
  }

  .header-subtitle {
    font-size: 0.9rem;
    text-align: center;
    line-height: 1.3;
  }

  .stats-cards {
    grid-template-columns: 1fr;
  }

  .header-actions {
    flex-direction: column;
    width: 100%;
    gap: 0.75rem;
    max-width: 280px;
    margin: 0 auto;
  }

  .action-btn {
    width: 100%;
    height: 48px;
    font-size: 0.9rem;
  }

  .title-icon .v-avatar {
    width: 48px !important;
    height: 48px !important;
  }

  .title-icon .v-icon {
    font-size: 24px !important;
  }

  .range-inputs {
    flex-direction: column;
    gap: 0.5rem;
  }

  .range-separator {
    display: none;
  }

  .actions-container .v-btn-group {
    flex-direction: column;
  }

  /* Mobile card improvements for small screens */
  .institution-header {
    grid-template-columns: auto 1fr;
    gap: 0.75rem;
  }

  .institution-status {
    grid-column: 1 / -1;
    align-items: flex-start;
    margin-top: 0.5rem;
  }

  .medical-stats-modern {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .modern-stat-item {
    padding: 0.5rem 0.75rem;
    gap: 0.5rem;
    align-items: flex-start;
  }

  .stat-icon-wrapper {
    width: 28px;
    height: 28px;
    margin-top: 0.1rem;
  }

  .stat-value {
    font-size: 0.8125rem;
  }

  .stat-label {
    font-size: 0.6875rem;
  }

  .specialties-chips-modern {
    gap: 0.25rem;
  }
}

/* Animation and Transitions */
.v-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.v-btn {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.v-chip {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Custom scrollbar for tables */
:deep(.v-table) {
  border-radius: 0;
}

:deep(.v-data-table__wrapper) {
  border-radius: 0 0 16px 16px;
}

/* Improve chip readability */
.v-chip--variant-tonal {
  backdrop-filter: blur(8px);
}

/* Loading states */
.v-skeleton-loader {
  border-radius: 8px;
}

/* Improved Focus States */
.v-btn:focus-visible {
  outline: 2px solid rgba(var(--v-theme-primary), 0.5);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(var(--v-theme-primary), 0.1);
}

/* Enhanced input focus styles */
.v-text-field:focus-within,
.v-select:focus-within {
  outline: none;
}

.v-text-field:focus-within :deep(.v-field),
.v-select:focus-within :deep(.v-field) {
  border: 2px solid rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 4px rgba(var(--v-theme-primary), 0.08);
  background: rgba(var(--v-theme-primary), 0.02);
}

.v-text-field:focus-within :deep(.v-field__outline),
.v-select:focus-within :deep(.v-field__outline) {
  opacity: 0;
}

/* Remove double border on outlined variants */
.v-text-field--variant-outlined :deep(.v-field__outline__start),
.v-text-field--variant-outlined :deep(.v-field__outline__end),
.v-text-field--variant-outlined :deep(.v-field__outline__notch::before),
.v-text-field--variant-outlined :deep(.v-field__outline__notch::after),
.v-select--variant-outlined :deep(.v-field__outline__start),
.v-select--variant-outlined :deep(.v-field__outline__end),
.v-select--variant-outlined :deep(.v-field__outline__notch::before),
.v-select--variant-outlined :deep(.v-field__outline__notch::after) {
  border-color: rgba(var(--v-theme-outline), 0.2);
  transition: all 0.3s ease;
}

/* Hover states for inputs */
.v-text-field:hover :deep(.v-field),
.v-select:hover :deep(.v-field) {
  background: rgba(var(--v-theme-primary), 0.01);
  border-color: rgba(var(--v-theme-primary), 0.3);
  transition: all 0.2s ease;
}
</style>
