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
import type { DiamAjax, VID } from '@inception-project/inception-js-api'
import { highlights } from './ApacheAnnotatorVisualizer'
import { createPopper, Instance } from '@popperjs/core'

export class ApacheAnnotatorSelector {
  private ajax: DiamAjax
  private root: Element

  private popup: Instance | undefined
  private popupContent: HTMLElement | undefined
  private popupAnchor: HTMLElement | undefined

  public constructor (element: Element, ajax: DiamAjax) {
    this.ajax = ajax
    this.root = element

    this.root.addEventListener('mousedown', e => this.onMouseDown(e))
  }

  private onMouseDown (event: Event): void {
    // Destroy popup if clicked outside of popup
    if (!this.isVisible()) {
      return
    }

    if (event.target instanceof Node && this.popupContent?.contains(event.target as Node)) {
      return
    }

    this.destoryPopup()
  }

  private destoryPopup () {
    if (!this.popup) {
      return
    }

    this.popup.destroy()
    this.popupContent?.remove()
    this.popupAnchor?.remove()
    this.popup = undefined
    this.popupContent = undefined
    this.popupAnchor = undefined
  }

  public isVisible (): boolean {
    return this.popup !== undefined
  }

  public showSelector (event: Event): void {
    const mouseEvent = event as MouseEvent

    this.destoryPopup()

    const hls = highlights(event.target)

    if (hls.length === 0) {
      return
    }

    if (hls.length === 1) {
      const vid = hls[0].getAttribute('data-iaa-id')
      if (vid) this.ajax.selectAnnotation(vid)
      return
    }

    this.popupAnchor = document.createElement('div')
    this.popupAnchor.style.position = 'absolute'
    this.popupAnchor.style.top = `${mouseEvent.clientY + window.scrollY}px`
    this.popupAnchor.style.left = `${mouseEvent.clientX}px`
    this.popupAnchor.style.pointerEvents = 'none'
    this.popupAnchor.style.visibility = 'hidden'
    this.root.ownerDocument.body.appendChild(this.popupAnchor)

    this.popupContent = document.createElement('div')
    this.popupContent.classList.add('iaa-menu')
    for (const hl of hls) {
      const vid = hl.getAttribute('data-iaa-id')
      if (!vid) continue

      const menuItem = document.createElement('div')
      menuItem.classList.add('iaa-menu-item')

      const labelArea = document.createElement('div')
      labelArea.classList.add('iaa-label')
      labelArea.textContent = hl.getAttribute('data-iaa-label') || 'no label'
      labelArea.style.cursor = 'pointer'
      labelArea.addEventListener('click', e => this.onSelectAnnotation(e, vid))
      menuItem.appendChild(labelArea)

      const deleteButton = document.createElement('a')
      deleteButton.classList.add('iaa-btn')
      deleteButton.textContent = '❌'
      deleteButton.addEventListener('click', e => this.onDeleteAnnotation(e, vid))
      menuItem.appendChild(deleteButton)

      this.popupContent.appendChild(menuItem)
    }
    this.root.ownerDocument.body.appendChild(this.popupContent)

    this.popup = createPopper(this.popupAnchor, this.popupContent, { placement: 'top' })
  }

  private onSelectAnnotation (event: Event, id: VID) {
    console.log(`Selecting annotation ${id}`)
    event.stopPropagation()
    this.destoryPopup()
    this.ajax.selectAnnotation(id)
  }

  private onDeleteAnnotation (event: Event, id: VID) {
    console.log(`Deleting annotation ${id}`)
    event.stopPropagation()
    this.destoryPopup()
    this.ajax.deleteAnnotation(id)
  }

  destroy (): void {
    this.destoryPopup()
  }
}
