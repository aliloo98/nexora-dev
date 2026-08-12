# Design System Documentation

This directory contains the official design system documentation for Nexora.

## Documentation Files

- **[dashboard-modes.md](./dashboard-modes.md)** - Dashboard mode system (Simplified vs Complete)
- **[motion.md](./motion.md)** - Motion system and animation guidelines

## Purpose

These documents serve as the authoritative reference for:
- UX patterns and interaction design
- Component behavior and state management
- Accessibility requirements
- Performance guidelines
- Implementation best practices

## Usage

When working on the Nexora codebase, always consult these documents before making design or UX changes. They provide the context and specifications needed to maintain consistency across the application.

## Maintaining Documentation

When implementing new features or modifying existing ones:
1. Update the relevant documentation files
2. Ensure all patterns follow the documented guidelines
3. Update test coverage to validate new patterns
4. Reference these documents in code comments where appropriate

## Design Principles

The Nexora design system follows these core principles:

1. **Clarity**: Interface should be immediately understandable
2. **Simplicity**: Avoid unnecessary complexity
3. **Consistency**: Maintain uniform patterns across the application
4. **Maintainability**: Code should be easy to understand and modify
5. **Performance**: Never sacrifice performance for visual effects
6. **Accessibility**: Ensure all users can use the application effectively

## Related Resources

- **AGENTS.md** (project root) - General development rules and guidelines
- **Component CSS** (`src/ui/components/components.css`) - Component styling
- **Motion CSS** (`src/ui/tokens/motion.css`) - Motion tokens and timing
