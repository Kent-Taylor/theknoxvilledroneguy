<script setup>
import { faFacebookF, faInstagram, faTiktok } from '@fortawesome/free-brands-svg-icons'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import heroImage from './assets/knoxville-drone-hero.png'
import logoImage from './assets/knoxville-drone-guy-logo.png'

const services = [
  {
    name: 'Real Estate Photo & Video',
    accent: 'coral',
    description:
      'Listing-ready aerial coverage for homes, land, developments, and short-term rentals.',
  },
  {
    name: 'Commercial Property',
    accent: 'gold',
    description:
      'Sharp exterior visuals for builders, brokers, roofers, venues, and local businesses.',
  },
  {
    name: 'Construction Progress',
    accent: 'teal',
    description:
      'Repeatable site flights that make milestones, conditions, and stakeholder updates easy to see.',
  },
  {
    name: 'Events & Tourism',
    accent: 'mint',
    description:
      'Modern highlight clips for outdoor events, attractions, neighborhoods, and brand campaigns.',
  },
  {
    name: 'Inspections',
    accent: 'lavender',
    description:
      'Close visual capture for roofs, lots, towers, and hard-to-reach angles without the extra hassle.',
  },
  {
    name: 'Custom Drone Content',
    accent: 'coral',
    description:
      'Flexible flight plans for social campaigns, promo videos, reveal shots, and one-off creative ideas.',
  },
]

const featuredStats = [
  { value: 'PART 107', label: 'licensed' },
  { value: '$0.5M', label: 'insured' },
  { value: '4K', label: 'deliverables' },
  { value: 'FAA', label: 'ready workflow' },
  { value: 'ETN', label: 'local coverage' },
  { value: 'EDITS', label: 'we will edit the videos & photos for your site or social media for you' },
]

const bookingHref =
  'mailto:theknoxvilledroneguy@gmail.com?subject=Drone%20booking%20request'
const phoneNumber = '8014277833'
const socialLinks = [
  {
    name: 'Instagram',
    icon: faInstagram,
    url: 'https://www.instagram.com/the_knoxville_drone_guy/',
  },
  {
    name: 'TikTok',
    icon: faTiktok,
    url: 'https://www.tiktok.com/@the_knoxville_drone_guy',
  },
  {
    name: 'Facebook',
    icon: faFacebookF,
    url: 'https://www.facebook.com/profile.php?id=61559774199765',
  },
]
const legalLinks = [
  { name: 'Privacy Policy', path: '/privacy-policy' },
  { name: 'Terms of Service', path: '/terms-of-service' },
]

const currentPath = ref(window.location.pathname)
const galleryItems = ref([])
const adminItems = ref([])
const visibleGalleryCount = ref(20)
const galleryStatus = ref('Loading gallery...')
const galleryError = ref('')
const authStatus = ref({ loggedIn: false, user: null })
const draggedItemId = ref('')
const selectedAdminItemId = ref('')
const selectedGalleryItem = ref(null)
const saveStatus = ref('')
const loadingMediaIds = ref(new Set())

const page = computed(() => {
  if (currentPath.value === '/gallery') {
    return 'gallery'
  }

  if (currentPath.value === '/login') {
    return 'login'
  }

  if (currentPath.value === '/privacy-policy') {
    return 'privacy'
  }

  if (currentPath.value === '/terms-of-service') {
    return 'terms'
  }

  return 'home'
})

const selectedAdminItem = computed(() =>
  adminItems.value.find((item) => item.id === selectedAdminItemId.value),
)

const visibleGalleryItems = computed(() => galleryItems.value.slice(0, visibleGalleryCount.value))
const hasMoreGalleryItems = computed(() => visibleGalleryCount.value < galleryItems.value.length)

function navigate(path) {
  window.history.pushState({}, '', path)
  currentPath.value = path
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function handlePopState() {
  currentPath.value = window.location.pathname
}

function normalizeRoute() {
  if (window.location.pathname === '/instagram') {
    window.history.replaceState({}, '', '/gallery')
    currentPath.value = '/gallery'
  }
}

function formatDate(value) {
  if (!value) {
    return 'Recent'
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}))
    throw new Error(errorPayload.message || errorPayload.error || `Request failed: ${response.status}`)
  }

  return response.json()
}

async function loadGallery() {
  galleryError.value = ''
  visibleGalleryCount.value = 20

  try {
    galleryItems.value = await fetchJson('/api/gallery')
    galleryStatus.value = galleryItems.value.length
      ? `${galleryItems.value.length} featured files`
      : 'No gallery files yet'
  } catch (error) {
    galleryError.value = `The gallery could not load yet: ${error.message}. Log in once so the server can access Drive.`
    galleryStatus.value = error.message
  }
}

function loadMoreGalleryItems() {
  if (!hasMoreGalleryItems.value) {
    return
  }

  visibleGalleryCount.value = Math.min(visibleGalleryCount.value + 20, galleryItems.value.length)
}

function handleGalleryScroll() {
  if (page.value !== 'gallery' || !hasMoreGalleryItems.value) {
    return
  }

  const cards = Array.from(document.querySelectorAll('.instagram-card'))
  const triggerCard = cards[Math.max(cards.length - 10, 0)]

  if (!triggerCard) {
    return
  }

  const triggerTop = triggerCard.getBoundingClientRect().top

  if (triggerTop < window.innerHeight + 160) {
    loadMoreGalleryItems()
  }
}

async function loadAuthStatus() {
  authStatus.value = await fetchJson('/api/google/auth/status').catch(() => ({
    loggedIn: false,
    user: null,
  }))
}

async function loadAdminGallery() {
  if (!authStatus.value.loggedIn) {
    return
  }

  adminItems.value = await fetchJson('/api/gallery/admin')

  if (!selectedAdminItemId.value && adminItems.value.length) {
    selectedAdminItemId.value = adminItems.value[0].id
  }
}

function isVideo(item) {
  return item?.media_type === 'VIDEO'
}

function openGalleryItem(item) {
  selectedGalleryItem.value = item

  if (isVideo(item)) {
    markMediaLoading(item.id)
  }
}

function closeGalleryItem() {
  if (selectedGalleryItem.value) {
    markMediaReady(selectedGalleryItem.value.id)
  }

  selectedGalleryItem.value = null
}

function getThumbnail(item) {
  return item?.thumbnail_url || ''
}

function getMediaStyle(item) {
  return {
    '--media-aspect-ratio': item?.aspect_ratio || '1 / 1',
  }
}

function handleGalleryImageError(event) {
  event.target.src = '/sample-instagram-aerial.png'
}

function markMediaLoading(id) {
  loadingMediaIds.value = new Set([...loadingMediaIds.value, id])
}

function markMediaReady(id) {
  const next = new Set(loadingMediaIds.value)
  next.delete(id)
  loadingMediaIds.value = next
}

function isMediaLoading(id) {
  return loadingMediaIds.value.has(id)
}

function onDragStart(item) {
  draggedItemId.value = item.id
}

async function onDrop(targetItem) {
  const fromIndex = adminItems.value.findIndex((item) => item.id === draggedItemId.value)
  const toIndex = adminItems.value.findIndex((item) => item.id === targetItem.id)

  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    draggedItemId.value = ''
    return
  }

  const nextItems = [...adminItems.value]
  const [moved] = nextItems.splice(fromIndex, 1)
  nextItems.splice(toIndex, 0, moved)
  adminItems.value = nextItems
  draggedItemId.value = ''
  await saveOrder()
}

async function saveOrder() {
  saveStatus.value = 'Saving order...'

  try {
    await fetchJson('/api/gallery/reorder', {
      method: 'POST',
      body: JSON.stringify({ ids: adminItems.value.map((item) => item.id) }),
    })
    saveStatus.value = 'Order saved'
    await loadGallery()
  } catch (error) {
    saveStatus.value = error.message
  }
}

async function saveAdminItem(item, updates) {
  saveStatus.value = 'Saving...'

  try {
    const updated = await fetchJson(`/api/gallery/items/${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
    const index = adminItems.value.findIndex((entry) => entry.id === item.id)

    if (index >= 0) {
      adminItems.value[index] = { ...adminItems.value[index], ...updated }
    }

    saveStatus.value = 'Saved'
    await loadGallery()
  } catch (error) {
    saveStatus.value = error.message
  }
}

async function captureThumbnail(item) {
  const video = document.querySelector(`#admin-video-${CSS.escape(item.id)}`)

  if (!video || !video.videoWidth) {
    saveStatus.value = 'Load and scrub the video first, then capture.'
    return
  }

  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const context = canvas.getContext('2d')
  context.drawImage(video, 0, 0, canvas.width, canvas.height)

  await saveAdminItem(item, {
    thumbnail_data_url: canvas.toDataURL('image/jpeg', 0.82),
  })
}

function uploadThumbnail(item, event) {
  const [file] = event.target.files || []

  if (!file) {
    return
  }

  const reader = new FileReader()
  reader.onload = async () => {
    await saveAdminItem(item, {
      thumbnail_data_url: reader.result,
    })
    event.target.value = ''
  }
  reader.readAsDataURL(file)
}

onMounted(() => {
  normalizeRoute()
  window.addEventListener('popstate', handlePopState)
  window.addEventListener('scroll', handleGalleryScroll, { passive: true })
  loadGallery()
  loadAuthStatus().then(loadAdminGallery)
})

onUnmounted(() => {
  window.removeEventListener('popstate', handlePopState)
  window.removeEventListener('scroll', handleGalleryScroll)
})
</script>

<template>
  <header class="site-header">
    <button class="brand" type="button" @click="navigate('/')">
      <span class="brand-mark">
        <img :src="logoImage" alt="" />
      </span>
      <span>
        <strong>The Knoxville Drone Guy</strong>
        <small>Aerial media for East Tennessee</small>
      </span>
    </button>

    <nav class="nav-links" aria-label="Main navigation">
      <button :class="{ active: page === 'home' }" type="button" @click="navigate('/')">Home</button>
      <button :class="{ active: page === 'gallery' }" type="button" @click="navigate('/gallery')">
        Gallery
      </button>
    </nav>
  </header>

  <main>
    <section v-if="page === 'home'" class="home-page">
      <section class="hero-section">
        <div class="hero-copy">
          <img class="hero-logo" :src="logoImage" alt="The Knoxville Drone Guy logo" />
          <p class="eyebrow">Drone & Ground photo, video, mapping, and inspections</p>
          <h1>The Knoxville Drone Guy</h1>
          <p class="hero-lede">
            Helping Knoxville businesses, properties and brands stand out with professional drone and ground videos and photos.
          </p>

          <div class="hero-actions">
            <a :href="bookingHref" class="primary-action">Book Now</a>
            <button class="secondary-action" type="button" @click="navigate('/gallery')">
              View recent work
            </button>
          </div>
        </div>

        <div class="hero-media">
          <img :src="heroImage" alt="The Knoxville Drone Guy preparing drone gear on location" />
        </div>
      </section>

      <section class="stats-band" aria-label="Service highlights">
        <div v-for="stat in featuredStats" :key="stat.label" class="stat-item">
          <strong>{{ stat.value }}</strong>
          <span>{{ stat.label }}</span>
        </div>
      </section>

      <section class="services-section">
        <div class="section-heading">
          <h2>Everything you need from takeoff to final files.</h2>
          <p class="eyebrow">Services</p>
        </div>

        <div class="service-grid">
          <article v-for="service in services" :key="service.name" class="service-card" :class="service.accent">
            <span class="service-dot"></span>
            <h3>{{ service.name }}</h3>
            <p>{{ service.description }}</p>
          </article>
        </div>
      </section>

      <section class="cta-band">
        <div>
          <p class="eyebrow">Knoxville based</p>
          <h2>Need aerial footage this week?</h2>
        </div>
        <div class="cta-actions">
          <a :href="`tel:${phoneNumber}`" class="primary-action">Call now</a>
          <a :href="`sms:${phoneNumber}`" class="secondary-action">Text Now</a>
        </div>
      </section>
    </section>

    <section v-else-if="page === 'gallery'" class="instagram-page">
      <section class="page-title">
        <p class="eyebrow">Media Portfolio</p>
        <h1>Project Gallery</h1>
        <p>
          A curated set of recent Knoxville Drone Guy videos, photos and behind the scenes.
        </p>
      </section>

      <section class="feed-toolbar" aria-label="Project gallery source">
        <a class="primary-action" :href="bookingHref">Book Now</a>
      </section>

      <p v-if="galleryError" class="feed-error">{{ galleryError }}</p>

      <section class="instagram-grid" aria-label="Google Drive project media">
        <article v-for="item in visibleGalleryItems" :key="item.id" class="instagram-card">
          <button class="media-button" type="button" :style="getMediaStyle(item)" @click="openGalleryItem(item)">
            <img
              v-if="getThumbnail(item)"
              :src="getThumbnail(item)"
              :alt="`${item.title} project media`"
              loading="lazy"
              @error="handleGalleryImageError"
            />
            <span v-else-if="isVideo(item)" class="media-placeholder">
              <span class="placeholder-title">{{ item.title }}</span>
              <span class="placeholder-hint">Video loads on play</span>
            </span>
            <img
              v-else
              :src="item.media_url"
              :alt="`${item.title} project media`"
              loading="lazy"
              @error="handleGalleryImageError"
            />
            <span v-if="isVideo(item)" class="play-icon" aria-hidden="true"></span>
            <span class="media-type">{{ item.media_type }}</span>
          </button>
          <div>
            <time :datetime="item.timestamp">{{ formatDate(item.timestamp) }}</time>
            <p>{{ item.title }}</p>
          </div>
        </article>
      </section>

      <p v-if="hasMoreGalleryItems" class="gallery-load-more" aria-live="polite">
        Loading more work...
      </p>

      <section
        v-if="selectedGalleryItem"
        class="media-viewer"
        role="dialog"
        aria-modal="true"
        :aria-label="selectedGalleryItem.title"
        @click.self="closeGalleryItem"
      >
        <div class="media-viewer-panel">
          <div class="media-viewer-header">
            <div>
              <strong>{{ selectedGalleryItem.title }}</strong>
              <span>{{ formatDate(selectedGalleryItem.timestamp) }}</span>
            </div>
            <button class="secondary-action compact" type="button" @click="closeGalleryItem">
              Close
            </button>
          </div>

          <div class="viewer-media-frame">
            <template v-if="isVideo(selectedGalleryItem)">
              <video
                :key="selectedGalleryItem.id"
                :src="selectedGalleryItem.media_url"
                :poster="getThumbnail(selectedGalleryItem) || undefined"
                controls
                autoplay
                playsinline
                preload="metadata"
                @loadstart="markMediaLoading(selectedGalleryItem.id)"
                @waiting="markMediaLoading(selectedGalleryItem.id)"
                @loadeddata="markMediaReady(selectedGalleryItem.id)"
                @canplay="markMediaReady(selectedGalleryItem.id)"
                @playing="markMediaReady(selectedGalleryItem.id)"
                @error="markMediaReady(selectedGalleryItem.id)"
              ></video>
              <span v-if="isMediaLoading(selectedGalleryItem.id)" class="viewer-loading">
                Loading video...
              </span>
            </template>
            <img
              v-else
              :src="selectedGalleryItem.media_url"
              :alt="selectedGalleryItem.title"
              @error="handleGalleryImageError"
            />
          </div>
        </div>
      </section>

      <section class="integration-note subtle-note">
        <a class="primary-action" :href="bookingHref">Book Now</a>
      </section>
    </section>

    <section v-else-if="page === 'login'" class="login-page">
      <section class="page-title">
        <p class="eyebrow">Private studio</p>
        <h1>Gallery editor</h1>
        <p>
          Sign in with Google to stream Drive media through the site, rearrange the gallery, and pick
          custom video thumbnails.
        </p>
      </section>

      <section v-if="!authStatus.loggedIn" class="integration-note">
        <h2>Google login required</h2>
        <p>
          This connects your Google Drive to the server so public visitors can view the media without
          being asked to sign into Google.
        </p>
        <div class="hero-actions">
          <a class="primary-action" href="/api/google/auth/start">Sign in with Google</a>
        </div>
      </section>

      <section v-else class="admin-layout">
        <aside class="admin-list" aria-label="Gallery order">
          <div class="admin-list-header">
            <div>
              <strong>{{ authStatus.user?.email }}</strong>
              <span>{{ saveStatus || 'Drag items to rearrange the gallery.' }}</span>
            </div>
            <a class="secondary-action compact" href="/api/google/auth/logout">Log out</a>
          </div>

          <article
            v-for="item in adminItems"
            :key="item.id"
            class="admin-row"
            :class="{ selected: selectedAdminItemId === item.id }"
            draggable="true"
            @dragstart="onDragStart(item)"
            @dragover.prevent
            @drop="onDrop(item)"
            @click="selectedAdminItemId = item.id"
          >
            <span class="drag-handle">::</span>
            <img
              v-if="item.thumbnail_url"
              :src="item.thumbnail_url"
              :alt="`${item.title} thumbnail`"
              @error="handleGalleryImageError"
            />
            <span v-else-if="isVideo(item)" class="admin-thumb-placeholder">VIDEO</span>
            <img
              v-else
              :src="item.media_url"
              :alt="`${item.title} thumbnail`"
              @error="handleGalleryImageError"
            />
            <span>{{ item.title }}</span>
          </article>
        </aside>

        <section v-if="selectedAdminItem" class="admin-editor">
          <label>
            Title
            <input
              :value="selectedAdminItem.title"
              @change="saveAdminItem(selectedAdminItem, { title: $event.target.value })"
            />
          </label>

          <label class="toggle-row">
            <input
              type="checkbox"
              :checked="selectedAdminItem.hidden"
              @change="saveAdminItem(selectedAdminItem, { hidden: $event.target.checked })"
            />
            Hide from public gallery
          </label>

          <video
            v-if="isVideo(selectedAdminItem)"
            :id="`admin-video-${selectedAdminItem.id}`"
            class="admin-video"
            :src="selectedAdminItem.media_url"
            controls
            playsinline
            preload="metadata"
            @loadstart="markMediaLoading(selectedAdminItem.id)"
            @loadeddata="markMediaReady(selectedAdminItem.id)"
            @canplay="markMediaReady(selectedAdminItem.id)"
            @error="markMediaReady(selectedAdminItem.id)"
          ></video>
          <span v-if="isVideo(selectedAdminItem) && isMediaLoading(selectedAdminItem.id)" class="admin-loading">
            Loading video for thumbnail selection...
          </span>

          <img
            v-else
            class="admin-video"
            :src="selectedAdminItem.media_url"
            :alt="selectedAdminItem.title"
          />

          <div class="hero-actions">
            <button
              v-if="isVideo(selectedAdminItem)"
              class="primary-action"
              type="button"
              @click="captureThumbnail(selectedAdminItem)"
            >
              Use current frame as thumbnail
            </button>
            <button
              class="secondary-action"
              type="button"
              @click="saveAdminItem(selectedAdminItem, { thumbnail_data_url: '' })"
            >
              Reset thumbnail
            </button>
            <label class="upload-action">
              Upload thumbnail
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                @change="uploadThumbnail(selectedAdminItem, $event)"
              />
            </label>
          </div>
        </section>
      </section>
    </section>

    <section v-if="page === 'privacy'" class="legal-page">
      <section class="page-title">
        <p class="eyebrow">Website policy</p>
        <h1>Privacy Policy</h1>
        <p>How The Knoxville Drone Guy handles basic website and inquiry information.</p>
      </section>

      <article class="legal-content">
        <h2>Information We Collect</h2>
        <p>
          When you contact The Knoxville Drone Guy, we may collect details you choose to provide,
          such as your name, email address, phone number, project location, and project notes.
        </p>

        <h2>How We Use Information</h2>
        <p>
          We use submitted information to respond to inquiries, schedule work, provide quotes,
          deliver media, maintain the website, and improve our services.
        </p>

        <h2>Gallery And Media</h2>
        <p>
          Public gallery media may include project videos, photos, and behind-the-scenes content
          selected by The Knoxville Drone Guy. Admin access is restricted and uses Google login.
        </p>

        <h2>Third-Party Services</h2>
        <p>
          The site may use third-party services such as Google Drive, Google authentication, Railway,
          and social media platforms. Those services are governed by their own privacy policies.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about this policy can be sent to
          <a href="mailto:theknoxvilledroneguy@gmail.com">theknoxvilledroneguy@gmail.com</a>.
        </p>
      </article>
    </section>

    <section v-if="page === 'terms'" class="legal-page">
      <section class="page-title">
        <p class="eyebrow">Website terms</p>
        <h1>Terms of Service</h1>
        <p>Basic terms for using The Knoxville Drone Guy website.</p>
      </section>

      <article class="legal-content">
        <h2>Use Of This Site</h2>
        <p>
          By using this website, you agree to use it lawfully and avoid interfering with the site,
          its media, or its server-side services.
        </p>

        <h2>Service Information</h2>
        <p>
          Website content is provided for general information about drone, ground video, photo,
          mapping, inspection, and related media services. Project availability, pricing, and scope
          are confirmed directly with The Knoxville Drone Guy.
        </p>

        <h2>Media Ownership</h2>
        <p>
          Photos, videos, branding, and gallery content on this website may not be copied,
          republished, or reused without permission from The Knoxville Drone Guy or the applicable
          rights holder.
        </p>

        <h2>External Links</h2>
        <p>
          Links to social media profiles or other third-party sites are provided for convenience.
          The Knoxville Drone Guy is not responsible for external website content or policies.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these terms can be sent to
          <a href="mailto:theknoxvilledroneguy@gmail.com">theknoxvilledroneguy@gmail.com</a>.
        </p>
      </article>
    </section>
  </main>

  <footer class="site-footer">
    <p class="eyebrow">Follow The Knoxville Drone Guy</p>
    <nav class="social-links" aria-label="Social media links">
      <a
        v-for="social in socialLinks"
        :key="social.name"
        class="social-link"
        :href="social.url"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="`Open ${social.name} in a new tab`"
      >
        <span class="social-icon" aria-hidden="true">
          <svg
            :viewBox="`0 0 ${social.icon.icon[0]} ${social.icon.icon[1]}`"
            focusable="false"
          >
            <defs>
              <linearGradient :id="`socialGoldGradient-${social.name}`" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#fff4b8" />
                <stop offset="24%" stop-color="#f7ce58" />
                <stop offset="48%" stop-color="#b97916" />
                <stop offset="72%" stop-color="#fff0a8" />
                <stop offset="100%" stop-color="#d8a329" />
              </linearGradient>
            </defs>
            <path :d="social.icon.icon[4]" :fill="`url(#socialGoldGradient-${social.name})`" />
          </svg>
        </span>
        <span>{{ social.name }}</span>
      </a>
    </nav>
    <nav class="footer-legal-links" aria-label="Legal links">
      <button
        v-for="link in legalLinks"
        :key="link.path"
        type="button"
        @click="navigate(link.path)"
      >
        {{ link.name }}
      </button>
    </nav>
    <p class="copyright">© 2024 The Knoxville Drone Guy. All rights reserved.</p>
  </footer>
</template>
