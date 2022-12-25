/*
 * Licensed to the Technische Universität Darmstadt under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The Technische Universität Darmstadt
 * licenses this file to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import './ApacheAnnotatorEditor.scss'
import { unpackCompactAnnotatedTextV2, DiamAjax, DiamLoadAnnotationsOptions, VID, ViewportTracker, offsetToRange, AnnotatedText, Span, TextMarker } from '@inception-project/inception-js-api'
import { CompactAnnotatedText } from '@inception-project/inception-js-api/src/model/compact_v2'
import { highlightText } from '@apache-annotator/dom'

const CLASS_RELATED = 'iaa-related'

export class ApacheAnnotatorVisualizer {
  private ajax: DiamAjax
  private root: Element
  private toCleanUp = new Set<Function>()
  private observer: IntersectionObserver
  private tracker : ViewportTracker

  private alpha = '55'

  public constructor (element: Element, ajax: DiamAjax) {
    this.ajax = ajax
    this.root = element

    this.tracker = new ViewportTracker(this.root, () => this.loadAnnotations())
    this.root.addEventListener('mouseover', e => this.addAnnotationHighlight(e as MouseEvent))
    this.root.addEventListener('mouseout', e => this.removeAnnotationHighight(e as MouseEvent))
  }

  private addAnnotationHighlight (event: MouseEvent) {
    if (!(event.target instanceof Element)) return

    const vid = event.target.getAttribute('data-iaa-id')
    if (!vid) return

    this.getHighlightsForAnnotation(vid).forEach(e => e.classList.add('iaa-hover'))
  }

  private removeAnnotationHighight (event: MouseEvent) {
    if (!(event.target instanceof Element)) return

    this.root.querySelectorAll('.iaa-hover').forEach(e => e.classList.remove('iaa-hover'))
  }

  public loadAnnotations (): void {
    const options: DiamLoadAnnotationsOptions = {
      range: this.tracker.currentRange,
      includeText: false,
      format: 'compact_v2'
    }

    this.ajax.loadAnnotations(options)
      .then((doc: CompactAnnotatedText) => this.renderAnnotations(unpackCompactAnnotatedTextV2(doc)))
  }

  private renderAnnotations (doc: AnnotatedText): void {
    const startTime = new Date().getTime()

    this.clearHighlights()

    if (doc.spans) {
      console.log(`Loaded ${doc.spans.size} span annotations`)
      doc.spans.forEach(span => this.renderSpanAnnotation(doc, span))
      this.removeEmptyHighlights()
      this.renderInlineLabels()
    }

    if (doc.textMarkers) {
      doc.textMarkers.forEach(marker => this.renderTextMarker(doc, marker))
    }

    if (doc.relations) {
      this.renderSelectedRelationEndpointHighlights(doc)
    }

    const endTime = new Date().getTime()
    console.log(`Client-side rendering took ${Math.abs(endTime - startTime)}ms`)
  }

  /**
   * The highlighter may create highlighs that are empty (they do not even contain whitespace). This
   * method removes such highlights.
   */
  private removeEmptyHighlights () {
    this.getAllHighlights().forEach(e => {
      if (!e.textContent) {
        e.remove()
      }
    })
  }

  private renderInlineLabels () {
    // Find all the highlights that belong to the same annotation (VID)
    const highlightsByVid = this.groupHighlightsByVid(this.getAllHighlights())

    // Add special CSS classes to the first and last highlight of each annotation
    for (const highlights of highlightsByVid.values()) {
      if (highlights.length) {
        highlights.forEach(e => e.classList.add('iaa-inline-label'))
        highlights[0].classList.add('iaa-first-highlight')
        highlights[highlights.length - 1].classList.add('iaa-last-highlight')
      }
    }
  }

  private getAllHighlights () {
    return this.root.querySelectorAll('.iaa-highlighted')
  }

  // eslint-disable-next-line no-undef
  private groupHighlightsByVid (highlights: NodeListOf<Element>) {
    const spansByVid = new Map<VID, Array<Element>>()
    for (const highlight of highlights) {
      const vid = highlight.getAttribute('data-iaa-id')
      if (!vid) continue

      let sectionGroup = spansByVid.get(vid)
      if (!sectionGroup) {
        sectionGroup = []
        spansByVid.set(vid, sectionGroup)
      }
      sectionGroup.push(highlight)
    }
    return spansByVid
  }

  private renderSelectedRelationEndpointHighlights (doc: AnnotatedText) {
    const selectedAnnotationVids = doc.markedAnnotations.get('focus') || []
    for (const relation of doc.relations.values()) {
      if (!selectedAnnotationVids.includes(relation.vid)) {
        continue
      }

      const sourceVid = relation.arguments[0][0]
      const targetVid = relation.arguments[1][0]
      this.getHighlightsForAnnotation(sourceVid).forEach(e => e.classList.add(CLASS_RELATED))
      this.getHighlightsForAnnotation(targetVid).forEach(e => e.classList.add(CLASS_RELATED))
    }
  }

  // eslint-disable-next-line no-undef
  private getHighlightsForAnnotation (vid: VID) : NodeListOf<Element> {
    return this.root.querySelectorAll(`[data-iaa-id="${vid}"]`)
  }

  renderTextMarker (doc: AnnotatedText, marker: TextMarker) {
    const range = offsetToRange(this.root, marker.offsets[0][0] + doc.window[0], marker.offsets[0][1] + doc.window[0])

    if (!range) {
      console.debug('Could not render text marker: ' + marker)
      return
    }

    const attributes = {
      class: `iaa-marker-${marker[0]}`
    }

    this.toCleanUp.add(highlightText(range, 'mark', attributes))
  }

  renderSpanAnnotation (doc: AnnotatedText, span: Span) {
    const range = offsetToRange(this.root, span.offsets[0][0] + doc.window[0], span.offsets[0][1] + doc.window[0])
    if (!range) {
      console.debug('Could not render span annotation: ' + span)
      return
    }

    const classList = ['iaa-highlighted']
    const ms = doc.annotationMarkers.get(span.vid) || []
    ms.forEach(m => classList.push(`iaa-marker-${m.type}`))

    const styleList = [
      `--iaa-background-color: ${span.color || '#000000'}${this.alpha}`,
      `--iaa-border-color: ${span.color || '#000000'}`
    ]

    const attributes = {
      'data-iaa-id': `${span.vid}`,
      'data-iaa-label': `${span.label || '◌'}`,
      class: classList.join(' '),
      style: styleList.join('; ')
    }

    this.toCleanUp.add(highlightText(range, 'mark', attributes))
  }

  scrollTo (args: { offset: number; position: string; }): void {
    const range = offsetToRange(this.root, args.offset, args.offset)
    if (!range) return
    const removeHighlight = highlightText(range, 'mark', { id: 'iaa-scroll-marker' })
    this.root.querySelector('#iaa-scroll-marker')?.scrollIntoView(
      { behavior: 'auto', block: 'center', inline: 'nearest' })
    removeHighlight()
  }

  private clearHighlights (): void {
    if (!this.toCleanUp || this.toCleanUp.size === 0) {
      return
    }

    const startTime = new Date().getTime()
    const highlightCount = this.toCleanUp.size
    this.toCleanUp.forEach(cleanup => cleanup())
    this.toCleanUp.clear()
    this.root.normalize() // https://github.com/apache/incubator-annotator/issues/120
    const endTime = new Date().getTime()
    console.log(`Cleaning up ${highlightCount} annotations and normalizing DOM took ${Math.abs(endTime - startTime)}ms`)
  }

  destroy (): void {
    if (this.observer) {
      this.observer.disconnect()
    }

    this.clearHighlights()
  }
}

export function closestHighlight (target: any): HTMLElement | null {
  if (!(target instanceof Node)) {
    return null
  }

  if (target instanceof Text) {
    target = (target as Text).parentElement
  }

  const targetElement = target as Element
  return targetElement.closest('[data-iaa-id]')
}

export function highlights (target: any): HTMLElement[] {
  let hl = closestHighlight(target)
  const result: HTMLElement[] = []
  while (hl) {
    result.push(hl)
    hl = closestHighlight(hl.parentElement)
  }
  return result
}
