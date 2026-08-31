import type { Meta, StoryObj } from '@storybook/react-vite'
import { fontSize, semanticColor } from '@thegame/tokens'
import { Text } from './Text'

const meta = {
  title: 'Foundation/Tokens',
  parameters: { layout: 'padded' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Colors: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
      {Object.entries(semanticColor.light).map(([name, value]) => (
        <div key={name}>
          <div
            style={{
              height: 56,
              borderRadius: 10,
              background: value,
              border: '1px solid var(--tg-color-border)',
            }}
          />
          <Text size="sm" as="div">
            {name}
          </Text>
          <Text size="xs" tone="muted" as="div">
            {value}
          </Text>
        </div>
      ))}
    </div>
  ),
}

export const TypeScale: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12 }}>
      {Object.entries(fontSize).map(([name, value]) => (
        <div key={name} style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
          <Text size="xs" tone="muted" as="span">
            {name} · {value}px
          </Text>
          <span style={{ fontSize: value }}>모든 강연을, 모든 언어로 Aa</span>
        </div>
      ))}
    </div>
  ),
}
