import type { Meta, StoryObj } from '@storybook/react-vite'
import { Badge } from './Badge'
import { Card } from './Card'
import { Heading, Text } from './Text'

const meta = {
  title: 'Components/Card',
  component: Card,
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: (
      <div style={{ display: 'grid', gap: 8, maxWidth: 360 }}>
        <Badge tone="success" dot>
          Live
        </Badge>
        <Heading level={3}>Opening Keynote</Heading>
        <Text tone="muted" size="sm">
          Dr. Kim · Hall A · KO → EN, JA, ZH
        </Text>
      </div>
    ),
  },
}

export const Elevated: Story = {
  args: {
    elevated: true,
    padding: 'lg',
    children: <Text>Elevated card with large padding</Text>,
  },
}
