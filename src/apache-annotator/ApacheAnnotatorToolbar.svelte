<!--
  Licensed to the Technische Universität Darmstadt under one
  or more contributor license agreements.  See the NOTICE file
  distributed with this work for additional information
  regarding copyright ownership.  The Technische Universität Darmstadt
  licenses this file to you under the Apache License, Version 2.0 (the
  "License"); you may not use this file except in compliance
  with the License.

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
-->
<script lang="ts">
  import { inlineLabelsEnabled } from './ApacheAnnotatorState'
</script>

<div class="toolbar card border-0 border-bottom rounded-0 p-1">
  <div>
    <div class="form-check form-switch">
      <input class="form-check-input" type="checkbox" role="switch" id="inlineLabelsEnabled" bind:checked={$inlineLabelsEnabled}>
      <label class="form-check-label" for="inlineLabelsEnabled">Inline</label>
    </div>
  </div>
</div>

<!-- svelte-ignore css-unused-selector -->
<style lang="scss">
  @import '../../node_modules/bootstrap/scss/bootstrap.scss';
</style>
