import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { UploadZone } from '@/components/upload/UploadZone';

describe('UploadZone', () => {
  it('aceita arquivo JSON valido', async () => {
    const onFileAccepted = vi.fn();
    const { container } = render(<UploadZone onFileAccepted={onFileAccepted} />);

    const input = container.querySelector('input[type="file"]');
    expect(input).not.toBeNull();

    const validFile = new File([JSON.stringify([{ dot_number: '1' }])], 'payload.json', {
      type: 'application/json',
    });

    fireEvent.change(input as HTMLInputElement, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(onFileAccepted).toHaveBeenCalledTimes(1);
    });
  });

  it('rejeita arquivo invalido', async () => {
    const onFileAccepted = vi.fn();
    const { container } = render(<UploadZone onFileAccepted={onFileAccepted} />);
    const input = container.querySelector('input[type="file"]');

    const invalidFile = new File(['not json'], 'payload.txt', {
      type: 'text/plain',
    });

    fireEvent.change(input as HTMLInputElement, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(screen.getByText(/Arquivo invalido/i)).toBeInTheDocument();
    });
    expect(onFileAccepted).not.toHaveBeenCalled();
  });
});
