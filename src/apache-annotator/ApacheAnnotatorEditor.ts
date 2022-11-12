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
import { AnnotationEditor, DiamAjax, calculateStartOffset } from '@inception-project/inception-js-api'
import { highlights, ApacheAnnotatorVisualizer } from './ApacheAnnotatorVisualizer'
import { ApacheAnnotatorSelector } from './ApacheAnnotatorSelector'

export class ApacheAnnotatorEditor implements AnnotationEditor {
  private ajax: DiamAjax
  private root: Element
  private vis: ApacheAnnotatorVisualizer
  private selector: ApacheAnnotatorSelector

  public constructor (element: Element, ajax: DiamAjax) {
    this.ajax = ajax
    this.root = element
    this.vis = new ApacheAnnotatorVisualizer(element, ajax)
    this.selector = new ApacheAnnotatorSelector(element, ajax)

    element.addEventListener('mouseup', e => this.onMouseUp(e))
    element.addEventListener('contextmenu', e => this.onRightClick(e))

    // Prevent right-click from triggering a selection event
    element.addEventListener('mousedown', e => this.cancelRightClick(e), { capture: true })
    element.addEventListener('mouseup', e => this.cancelRightClick(e), { capture: true })
    element.addEventListener('mouseclick', e => this.cancelRightClick(e), { capture: true })
  }

  private cancelRightClick (e: Event): void {
    if (e instanceof MouseEvent) {
      if (e.button === 2) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
  }

  onMouseUp (event: Event): void {
    console.log('Mouse up', event.target)

    const sel = window.getSelection()
    if (!sel) return

    if (sel.isCollapsed) {
      if (!this.selector.isVisible()) {
        this.selector.showSelector(event)
      }
      return
    }

    const anchorOffset = calculateStartOffset(this.root, sel.anchorNode) + sel.anchorOffset
    const focusOffset = calculateStartOffset(this.root, sel.focusNode) + sel.focusOffset
    sel.removeAllRanges()

    const begin = Math.min(anchorOffset, focusOffset)
    const end = Math.max(anchorOffset, focusOffset)
    this.ajax.createSpanAnnotation([[begin, end]], '')
  }

  onRightClick (event: Event): void {
    if (!(event instanceof MouseEvent)) return

    const hls = highlights(event.target)
    if (hls.length === 0) return

    // If the user shift-right-clicks, open the normal browser context menu. This is useful
    // e.g. during debugging / developing
    if (event.shiftKey) return

    if (hls.length === 1) {
      event.preventDefault()
      const vid = hls[0].getAttribute('data-iaa-id')
      if (vid) this.ajax.openContextMenu(vid, event)
    }
  }

  loadAnnotations (): void {
    this.vis.loadAnnotations()
  }

  scrollTo (args: { offset: number; position: string; }): void {
    this.vis.scrollTo(args)
  }

  destroy (): void {
    this.vis.destroy()
    this.selector.destroy()
  }
}
