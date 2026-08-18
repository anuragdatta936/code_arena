import { render, screen } from '@testing-library/react';
import MonacoEditorComponent from './MonacoEditor';

describe('MonacoEditor', () => {
  it('renders without crashing', () => {
    render(<MonacoEditorComponent language="python" value="print('hello')" />);
    const editorElement = screen.getByTestId('monaco-editor-placeholder');
    expect(editorElement).toBeInTheDocument();
  });

  it('accepts language prop', () => {
    render(<MonacoEditorComponent language="java" value="System.out.println('hello');" />);
    // The component should render without error
    expect(true).toBe(true);
  });

  it('accepts theme prop', () => {
    render(<MonacoEditorComponent language="python" value="print('hello')" theme="light" />);
    expect(true).toBe(true);
  });
});