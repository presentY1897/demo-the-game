import type { Meta, StoryObj } from '@storybook/react-vite'
import { Badge } from './Badge'

const meta = {
  title: 'Components/Badge',
  component: Badge,
  args: { children: 'Badge' },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Tones: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8 }}>
      <Badge tone="neutral">Neutral</Badge>
      <Badge tone="success">Success</Badge>
      <Badge tone="warning">Warning</Badge>
      <Badge tone="danger">Danger</Badge>
      <Badge tone="info">Info</Badge>
    </div>
  ),
}

export const ConnectionStatus: Story = {
  name: '연결 상태 인디케이터',
  render: () => (
    <div style={{ display: 'flex', gap: 8 }}>
      <Badge tone="success" dot>
        Live
      </Badge>
      <Badge tone="warning" dot>
        Reconnecting…
      </Badge>
      <Badge tone="danger" dot>
        Disconnected
      </Badge>
    </div>
  ),
}
