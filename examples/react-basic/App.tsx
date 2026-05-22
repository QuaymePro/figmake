import React from 'react';
import { Button } from './components/Button';
import { Card } from './components/Card';

function App() {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Figmake React Example</h1>
      <p>This project shows how to use components exported by Figmake.</p>
      
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <Button text="Get Started" variant="primary" />
        <Button text="Learn More" variant="secondary" />
      </div>

      <Card 
        title="Modern Component" 
        description="Generated directly from Figma with pixel-perfect accuracy."
      />
    </div>
  );
}

export default App;
