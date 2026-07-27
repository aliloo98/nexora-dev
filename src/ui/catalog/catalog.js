import '../index.css'
import './catalog.css'
import {
  createAppShell,
  createBadge,
  createButton,
  createCard,
  createChip,
  createCluster,
  createCoachCard,
  createDivider,
  createEmptyState,
  createGoalCard,
  createInput,
  createLoadingState,
  createMetricCard,
  createModal,
  createPageHeader,
  createProgress,
  createSectionHeader,
  createSkeleton,
  createStack,
  createStatRow,
  createToastRegion
} from '../index.js'

const mount = document.getElementById('nx-catalog-main')
const page = createAppShell({ as: 'div' })
page.classList.add('nx-catalog')
mount.appendChild(page)

const makeSection = ({ title, description, children, columns = 2 }) => {
  const section = document.createElement('section')
  section.className = 'nx-catalog__section'
  section.appendChild(createSectionHeader({ title, description, headingLevel: 2 }))
  const grid = document.createElement('div')
  grid.className = `nx-catalog__grid${columns === 3 ? ' nx-catalog__grid--three' : ''}`
  ;(Array.isArray(children) ? children : [children]).forEach((child) => grid.appendChild(child))
  section.appendChild(grid)
  return section
}

const makeSample = (title, children) => {
  const sample = createCard({ padding: 'default', children: [] })
  sample.classList.add('nx-catalog__sample')
  const sampleTitle = document.createElement('h3')
  sampleTitle.className = 'nx-catalog__sample-title'
  sampleTitle.textContent = title
  sample.appendChild(sampleTitle)
  ;(Array.isArray(children) ? children : [children]).forEach((child) => sample.appendChild(child))
  return sample
}

const intro = document.createElement('header')
intro.className = 'nx-catalog__intro'
const introCopy = document.createElement('div')
introCopy.className = 'nx-catalog__intro-copy'
const eyebrow = document.createElement('span')
eyebrow.className = 'nx-catalog__eyebrow'
eyebrow.textContent = 'Calm intelligence'
const title = document.createElement('h1')
title.className = 'nx-catalog__title'
title.textContent = 'Nexora UI V2'
const description = document.createElement('p')
description.textContent = 'Catalogue local des fondations, états et composants du Design System.'
introCopy.append(eyebrow, title, description)
intro.appendChild(introCopy)
page.appendChild(intro)

const buttons = createCluster({
  gap: 'sm',
  children: [
    createButton({ label: 'Action principale', variant: 'primary' }),
    createButton({ label: 'Action secondaire', variant: 'secondary' }),
    createButton({ label: 'Action discrète', variant: 'ghost' }),
    createButton({ label: 'Supprimer', variant: 'danger' })
  ]
})
const buttonStates = createCluster({
  gap: 'sm',
  children: [
    createButton({ label: 'Chargement', loading: true }),
    createButton({ label: 'Indisponible', disabled: true }),
    createButton({ size: 'icon-only', variant: 'secondary', icon: 'plus', ariaLabel: 'Ajouter' }),
    createButton({ label: 'Compact', size: 'compact', variant: 'secondary' })
  ]
})
page.appendChild(makeSection({
  title: 'Actions',
  description: 'Une seule action principale par écran. Toutes les cibles restent tactiles.',
  children: [
    makeSample('Variantes', buttons),
    makeSample('États', buttonStates)
  ]
}))

let chipSelected = true
const selectedChip = createChip({
  label: 'Ce mois',
  selected: chipSelected,
  onChange: (next) => {
    chipSelected = next
    selectedChip.setAttribute('aria-pressed', next ? 'true' : 'false')
    selectedChip.classList.toggle('nx-chip--selected', next)
  }
})
page.appendChild(makeSection({
  title: 'Formulaires et statuts',
  description: 'Labels persistants, erreurs associées et distinction nette entre badge et filtre.',
  children: [
    makeSample('Champs', createStack({
      gap: 'md',
      children: [
        createInput({
          id: 'catalog-income',
          label: 'Revenus mensuels',
          value: '3000',
          suffix: '€',
          inputMode: 'decimal',
          helper: 'Montant net disponible ce mois.'
        }),
        createInput({
          id: 'catalog-error',
          label: 'Montant à épargner',
          value: '-20',
          suffix: '€',
          error: 'Le montant doit être positif.'
        }),
        createInput({
          id: 'catalog-disabled',
          label: 'Synchronisation',
          value: 'Indisponible',
          disabled: true
        })
      ]
    })),
    makeSample('Badges et chips', createStack({
      gap: 'md',
      children: [
        createCluster({
          gap: 'xs',
          children: [
            createBadge({ label: 'Stable', tone: 'stable' }),
            createBadge({ label: 'Succès', tone: 'success' }),
            createBadge({ label: 'Vigilance', tone: 'warning' }),
            createBadge({ label: 'Critique', tone: 'danger' }),
            createBadge({ label: 'Information', tone: 'info' })
          ]
        }),
        createCluster({
          gap: 'xs',
          children: [
            selectedChip,
            createChip({ label: 'Trimestre', selected: false }),
            createChip({ label: 'Désactivé', disabled: true })
          ]
        })
      ]
    }))
  ]
}))

page.appendChild(makeSection({
  title: 'Cartes financières',
  description: 'Les valeurs sont préparées en amont ; les composants ne calculent rien.',
  columns: 3,
  children: [
    createMetricCard({
      label: 'Revenus',
      value: '3 000 €',
      context: 'Juillet 2026',
      tone: 'positive',
      trend: { label: '+ 4 %', tone: 'success' }
    }),
    createMetricCard({
      label: 'Dépenses',
      value: '1 349 €',
      context: '45 % des revenus',
      tone: 'warning'
    }),
    createMetricCard({
      label: 'Reste',
      value: '- 120 €',
      context: 'Projection fin de mois',
      tone: 'critical'
    })
  ]
}))

page.appendChild(makeSection({
  title: 'Coach et objectif',
  description: 'Une recommandation prioritaire et une seule action maximum.',
  children: [
    createCoachCard({
      eyebrow: 'Coach Nexora',
      title: 'Tu peux encore économiser 240 € ce mois.',
      description: 'Tes charges sont couvertes et ton rythme actuel te laisse une marge saine jusqu’à la fin du cycle.',
      level: 'opportunity',
      actionLabel: 'Mettre 240 € de côté',
      onAction: () => toastRegion.show({ message: 'Action Coach déclenchée', tone: 'success' })
    }),
    createGoalCard({
      name: 'Coussin de sécurité',
      currentAmount: '1 500 €',
      targetAmount: '5 000 €',
      percentage: 30,
      percentageLabel: '30 %',
      remaining: '3 500 €',
      deadline: 'Décembre 2027',
      statusLabel: 'En cours',
      statusTone: 'stable',
      actionLabel: 'Voir l’objectif',
      onAction: () => toastRegion.show({ message: 'Objectif ouvert', tone: 'info' }),
      secondaryActionLabel: 'Ouvrir le menu de l’objectif',
      onSecondaryAction: () => toastRegion.show({ message: 'Menu secondaire', tone: 'neutral' })
    })
  ]
}))

page.appendChild(makeSection({
  title: 'Progression et données',
  children: [
    makeSample('Progressions', createStack({
      gap: 'lg',
      children: [
        createProgress({ label: 'Objectif Maison', value: 72, max: 100, valueLabel: '72 %' }),
        createProgress({ label: 'Budget utilisé', value: 45, max: 100, valueLabel: '45 %', thickness: 4 }),
        createProgress({ label: 'Chargement', indeterminate: true, ariaLabel: 'Chargement de la progression' })
      ]
    })),
    makeSample('Stat rows', createStack({
      gap: 'none',
      children: [
        createStatRow({ label: 'Disponible', value: '1 651 €', helper: 'Jusqu’au 31 juillet', tone: 'positive' }),
        createStatRow({ label: 'Charges restantes', value: '430 €', tone: 'warning' }),
        createStatRow({ label: 'Projection', value: '- 80 €', tone: 'critical' })
      ]
    }))
  ]
}))

const loadingSamples = createStack({
  gap: 'lg',
  children: [
    createLoadingState({ label: 'Chargement de la synthèse' }),
    createSkeleton({ shape: 'text', size: 'sm' }),
    createSkeleton({ shape: 'block', size: 'lg' }),
    createSkeleton({ shape: 'circle', size: 'md' })
  ]
})
page.appendChild(makeSection({
  title: 'États système',
  children: [
    makeSample('Chargement', loadingSamples),
    createEmptyState({
      icon: 'plus',
      title: 'Aucun objectif',
      description: 'Ajoute un premier objectif pour donner une direction claire à ton épargne.',
      actionLabel: 'Créer un objectif',
      onAction: () => toastRegion.show({ message: 'Création d’objectif', tone: 'info' })
    })
  ]
}))

const modalBody = document.createElement('div')
modalBody.className = 'nx-catalog__modal-copy'
const modalText = document.createElement('p')
modalText.textContent = 'Cette action reste locale au catalogue et ne modifie aucune donnée financière.'
const modalInput = createInput({
  id: 'catalog-modal-input',
  label: 'Libellé de confirmation',
  placeholder: 'Saisir une valeur'
})
modalBody.append(modalText, modalInput)
const modalCancel = createButton({ label: 'Annuler', variant: 'ghost' })
const modalConfirm = createButton({ label: 'Confirmer', variant: 'primary' })
const modal = createModal({
  title: 'Confirmer l’action',
  description: 'Exemple de dialogue accessible.',
  content: modalBody,
  footer: [modalCancel, modalConfirm],
  initialFocus: () => modalInput.querySelector('input')
})
modalCancel.addEventListener('click', () => modal.close('cancel'))
modalConfirm.addEventListener('click', () => modal.close('confirm'))

const openModal = createButton({
  label: 'Ouvrir la modale',
  variant: 'secondary',
  onClick: () => modal.open()
})
openModal.id = 'nx-catalog-open-modal'
const showToast = createButton({
  label: 'Afficher un toast',
  variant: 'secondary',
  onClick: () => toastRegion.show({
    message: 'Les préférences ont été enregistrées.',
    tone: 'success',
    actionLabel: 'Annuler',
    onAction: () => {}
  })
})
showToast.id = 'nx-catalog-show-toast'

page.appendChild(makeSection({
  title: 'Superpositions',
  description: 'Focus contrôlé, restauration, annonces accessibles et aucun déplacement de layout.',
  children: [
    makeSample('Modale', openModal),
    makeSample('Toast', showToast)
  ]
}))

page.appendChild(createDivider({ decorative: true }))
page.appendChild(createPageHeader({
  title: 'Fin du catalogue',
  description: 'Cette page est disponible uniquement comme outil de développement local.',
  headingLevel: 2
}))

const toastRegion = createToastRegion()
