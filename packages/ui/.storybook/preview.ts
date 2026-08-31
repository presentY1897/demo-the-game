import type { Preview } from '@storybook/react-vite'
import { themeCss } from '@thegame/tokens'

const style = document.createElement('style')
style.textContent = `${themeCss()}
body {
  font-family: var(--tg-font-sans);
  color: var(--tg-color-text);
  background: var(--tg-color-bg);
}`
document.head.append(style)

const preview: Preview = {
  parameters: {
    layout: 'centered',
    controls: { expanded: true },
  },
}

export default preview
