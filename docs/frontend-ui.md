# Frontend UI Guide

This document describes the frontend architecture and UI components used in LOCO RAG Engine.

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.x | React framework |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Utility-first CSS |
| shadcn/ui | Latest | Component library |
| lucide-react | Latest | Icon library |

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx           # Main chat interface
│   │   ├── admin/
│   │   │   └── page.tsx       # Admin dashboard
│   │   ├── layout.tsx         # Root layout
│   │   └── globals.css        # Global styles
│   ├── components/
│   │   └── ui/                # shadcn components
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       └── ...
│   └── lib/
│       ├── api.ts             # API client
│       └── utils.ts           # Utility functions
└── components.json            # shadcn configuration
```

## shadcn/ui Components

The following shadcn/ui components are installed and used:

### Core Components

| Component | Usage |
|-----------|-------|
| `Button` | Primary actions, navigation |
| `Card` | Content containers, message bubbles |
| `Input` | Text input fields |
| `Label` | Form labels |

### Layout Components

| Component | Usage |
|-----------|-------|
| `ScrollArea` | Scrollable chat messages |
| `Separator` | Visual dividers |
| `Tabs` | Admin panel sections |

### Feedback Components

| Component | Usage |
|-----------|-------|
| `Alert` | Error messages |
| `Badge` | Source tags, status indicators |
| `Progress` | Upload progress |
| `Sonner` | Toast notifications |

### Navigation Components

| Component | Usage |
|-----------|-------|
| `Avatar` | User/bot avatars |
| `DropdownMenu` | Action menus (if needed) |

## Component Usage Examples

### Button Variants

```tsx
import { Button } from '@/components/ui/button';

// Primary button
<Button>Submit</Button>

// Outline button
<Button variant="outline">Cancel</Button>

// Ghost button
<Button variant="ghost">Settings</Button>

// Icon button
<Button size="icon"><Send className="w-4 h-4" /></Button>
```

### Card with Content

```tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description text</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
</Card>
```

### Toast Notifications

```tsx
import { toast } from 'sonner';

// Success toast
toast.success('Document uploaded successfully!');

// Error toast
toast.error('Failed to upload document');

// Info toast
toast.info('Processing...');
```

### Slider for Settings

```tsx
import { Slider } from '@/components/ui/slider';

<Slider
  value={[0.7]}
  onValueChange={([value]) => handleChange(value)}
  min={0}
  max={2}
  step={0.1}
/>
```

## Styling Guidelines

### Color Theme

The application uses a dark theme with the following color tokens:

| Token | Usage |
|-------|-------|
| `background` | Page background |
| `foreground` | Primary text |
| `muted` | Secondary backgrounds |
| `muted-foreground` | Secondary text |
| `primary` | Primary actions, highlights |
| `destructive` | Error states |

### Spacing

Use Tailwind spacing utilities:
- `p-4`, `p-6` for padding
- `gap-2`, `gap-4` for flex/grid gaps
- `space-y-4` for vertical stacking

### Typography

- **Headings**: `text-xl font-bold`, `text-lg font-semibold`
- **Body**: Default text size
- **Muted**: `text-muted-foreground text-sm`

## Adding New Components

To add a new shadcn component:

```bash
cd frontend
npx shadcn@latest add <component-name>
```

Available components: [shadcn/ui Components](https://ui.shadcn.com/docs/components)

## Icons

Icons are provided by `lucide-react`:

```tsx
import { Send, Settings, FileText, Upload } from 'lucide-react';

<Send className="w-4 h-4" />
```

Browse available icons: [Lucide Icons](https://lucide.dev/icons)
