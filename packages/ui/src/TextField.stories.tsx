import type { Meta, StoryObj } from '@storybook/react-vite'
import { TextField } from './TextField'

const meta = {
  title: 'Components/TextField',
  component: TextField,
  args: { label: 'Email', placeholder: 'you@hospital.com' },
} satisfies Meta<typeof TextField>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithHint: Story = {
  args: { hint: 'We only use this to send the demo link.' },
}

export const WithError: Story = {
  args: { error: 'Please enter a valid email address.', defaultValue: 'not-an-email' },
}
