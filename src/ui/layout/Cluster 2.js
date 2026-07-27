import { appendContent, getDocument, normalizeChoice } from '../internal/dom.js'

const GAPS = ['none', '2xs', 'xs', 'sm', 'md', 'lg', 'xl']
const ALIGNMENTS = ['start', 'center', 'end', 'stretch', 'baseline']
const JUSTIFICATIONS = ['start', 'center', 'end', 'between']

/**
 * Creates a wrapping horizontal layout.
 * @example createCluster({ gap: 'sm', align: 'center', children: actions })
 */
export function createCluster(options = {}, documentRef) {
  const document = getDocument(documentRef)
  const gap = normalizeChoice(options.gap, GAPS, 'sm')
  const align = normalizeChoice(options.align, ALIGNMENTS, 'center')
  const justify = normalizeChoice(options.justify, JUSTIFICATIONS, 'start')
  const cluster = document.createElement('div')
  cluster.className = `nx-cluster nx-cluster--gap-${gap} nx-cluster--align-${align} nx-cluster--justify-${justify}`
  appendContent(cluster, options.children, document)
  return cluster
}

export default createCluster
