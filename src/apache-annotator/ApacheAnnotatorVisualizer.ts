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
import { CompactAnnotatedText, CompactTextMarker, CompactAnnotationMarker, CompactSpan, DiamAjax, DiamLoadAnnotationsOptions, VID, ViewportTracker, offsetToRange } from '@inception-project/inception-js-api'
import { highlightText } from '@apache-annotator/dom'

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
  }

  private makeMarkerMap<T> (markerList: T[] | undefined): Map<VID, Array<T>> {
    const markerMap = new Map<VID, Array<T>>()
    if (markerList) {
      markerList.forEach(marker => {
        marker[1].forEach(vid => {
          let ms = markerMap.get(vid)
          if (!ms) {
            ms = []
            markerMap.set(vid, ms)
          }
          ms.push(marker)
        })
      })
    }
    return markerMap
  }

  public loadAnnotations (): void {
    const options: DiamLoadAnnotationsOptions = {
      range: this.tracker.currentRange,
      includeText: false
    }

    this.ajax.loadAnnotations(options)
      .then((doc: CompactAnnotatedText) => this.renderAnnotations(doc))
  }

  private renderAnnotations (doc: CompactAnnotatedText): void {
    const startTime = new Date().getTime()
    const viewportBegin = doc.window[0]

    this.clearHighlights()

    if (doc.spans) {
      console.log(`Loaded ${doc.spans.length} span annotations`)
      const annotationMarkers = this.makeMarkerMap(doc.annotationMarkers)
      doc.spans.forEach(span => this.renderSpanAnnotation(span, viewportBegin, annotationMarkers))
    }

    const selectedAnnotationVids : VID[] = []
    if (doc.annotationMarkers) {
      doc.annotationMarkers.filter(marker => marker[0] === 'focus')
        .forEach(marker => marker[1].forEach(vid => selectedAnnotationVids.push(vid)))
    }

    if (doc.textMarkers) {
      doc.textMarkers.forEach(marker => this.renderTextMarker(marker, viewportBegin))
    }

    if (doc.relations) {
      this.renderSelectedRelationEndpointHighlights(doc, selectedAnnotationVids)
    }

    // Clean up empty highlights
    this.root.querySelectorAll('.iaa-highlighted').forEach(e => {
      if (!e.textContent) {
        e.remove()
      }
    })

    const endTime = new Date().getTime()

    console.log(`Client-side rendering took ${Math.abs(endTime - startTime)}ms`)
  }

  private renderSelectedRelationEndpointHighlights (doc: CompactAnnotatedText, selectedAnnotationVids: VID[]) {
    for (const relation of doc.relations || []) {
      const vid = relation[0]

      if (!selectedAnnotationVids.includes(vid)) {
        continue
      }

      const args = relation[1]
      const sourceVid = args[0][0]
      const targetVid = args[1][0]
      this.findSpanAnnotationElements(sourceVid).forEach(e => e.classList.add('iaa-related'))
      this.findSpanAnnotationElements(targetVid).forEach(e => e.classList.add('iaa-related'))
    }
  }

  private findSpanAnnotationElements (vid: VID) : NodeListOf<Element> {
    return this.root.querySelectorAll(`[data-iaa-id="${vid}"]`)
  }

  renderTextMarker (marker: CompactTextMarker, viewportBegin: number) {
    const range = offsetToRange(this.root, marker[1][0][0] + viewportBegin, marker[1][0][1] + viewportBegin)
    if (!range) {
      console.debug('Could not render text marker: ' + marker)
      return
    }
    const attributes = {
      class: `iaa-marker-${marker[0]}`
    }
    this.toCleanUp.add(highlightText(range, 'mark', attributes))
  }

  renderSpanAnnotation (span: CompactSpan, viewportBegin: number, annotationMarkers: Map<VID, Array<CompactAnnotationMarker>>) {
    const range = offsetToRange(this.root, span[1][0][0] + viewportBegin, span[1][0][1] + viewportBegin)
    if (!range) {
      console.debug('Could not render span annotation: ' + span)
      return
    }

    const classList = ['iaa-highlighted']
    const ms = annotationMarkers.get(span[0]) || []
    ms.forEach(m => classList.push(`iaa-marker-${m[0]}`))

    const cAttrs = span[2]
    const styleList = [
      `background-color: ${cAttrs?.c}${this.alpha}`,
      `border-bottom-color: ${cAttrs?.c};`
    ]

    const attributes = {
      'data-iaa-id': `${span[0]}`,
      'data-iaa-label': `${cAttrs?.l}`,
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
