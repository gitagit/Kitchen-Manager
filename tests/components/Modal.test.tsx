import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal, { ConfirmModal, Toast } from '@/app/components/Modal';

describe('Modal Component', () => {
  it('renders when open is true', () => {
    render(
      <Modal open={true} onClose={() => {}} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );

    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(
      <Modal open={false} onClose={() => {}} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );

    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="Test Modal">
        <p>Content</p>
      </Modal>
    );

    const closeButton = screen.getByLabelText('Close');
    await userEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders actions when provided', () => {
    render(
      <Modal
        open={true}
        onClose={() => {}}
        title="Test Modal"
        actions={<button>Custom Action</button>}
      >
        <p>Content</p>
      </Modal>
    );

    expect(screen.getByText('Custom Action')).toBeInTheDocument();
  });
});

describe('ConfirmModal Component', () => {
  it('renders with correct title and message', () => {
    render(
      <ConfirmModal
        open={true}
        onClose={() => {}}
        onConfirm={() => {}}
        title="Delete Item"
        message="Are you sure you want to delete this?"
      />
    );

    expect(screen.getByText('Delete Item')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this?')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmModal
        open={true}
        onClose={() => {}}
        onConfirm={onConfirm}
        title="Delete"
        message="Delete this?"
        confirmText="Yes, Delete"
      />
    );

    await userEvent.click(screen.getByText('Yes, Delete'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel button is clicked', async () => {
    const onClose = vi.fn();
    render(
      <ConfirmModal
        open={true}
        onClose={onClose}
        onConfirm={() => {}}
        title="Delete"
        message="Delete this?"
      />
    );

    await userEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows loading state when loading is true', () => {
    render(
      <ConfirmModal
        open={true}
        onClose={() => {}}
        onConfirm={() => {}}
        title="Delete"
        message="Delete this?"
        confirmText="Delete"
        loading={true}
      />
    );

    expect(screen.getByText('...')).toBeInTheDocument();
  });

  it('disables buttons when loading', () => {
    render(
      <ConfirmModal
        open={true}
        onClose={() => {}}
        onConfirm={() => {}}
        title="Delete"
        message="Delete this?"
        loading={true}
      />
    );

    expect(screen.getByText('Cancel')).toBeDisabled();
    expect(screen.getByText('...')).toBeDisabled();
  });
});

describe('Toast Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('renders with message', () => {
    render(<Toast message="Success!" type="success" onClose={() => {}} />);
    expect(screen.getByText('Success!')).toBeInTheDocument();
  });

  it('has correct role for accessibility', () => {
    render(<Toast message="Alert!" type="error" onClose={() => {}} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('calls onClose after timeout', async () => {
    const onClose = vi.fn();
    render(<Toast message="Test" type="info" onClose={onClose} />);

    expect(onClose).not.toHaveBeenCalled();

    vi.advanceTimersByTime(3000);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when dismiss button is clicked', async () => {
    vi.useRealTimers();
    const onClose = vi.fn();
    render(<Toast message="Test" type="info" onClose={onClose} />);

    await userEvent.click(screen.getByLabelText('Dismiss'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
