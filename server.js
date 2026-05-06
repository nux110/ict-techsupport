const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test connection
async function testConnection() {
  try {
    const { data, error } = await supabase.from('tickets').select('count').limit(1);
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    console.log('✅ Connected to Supabase successfully');
  } catch (error) {
    console.error('❌ Supabase connection error:', error.message);
    process.exit(1);
  }
}

// API Routes

// Get all tickets
app.get('/api/tickets', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single ticket
app.get('/api/tickets/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new ticket
app.post('/api/tickets', async (req, res) => {
  try {
    const { name, email, category, priority, subject, description } = req.body;

    if (!name || !email || !category || !subject || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data, error } = await supabase
      .from('tickets')
      .insert([
        {
          name,
          email,
          category,
          priority: priority || 'low',
          subject,
          description,
          status: 'open'
        }
      ])
      .select();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      ticketId: data[0]?.id,
      success: true,
      message: 'Ticket created successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update ticket status
app.patch('/api/tickets/:id', async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const { data, error } = await supabase
      .from('tickets')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json({ success: true, message: 'Ticket updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete ticket
app.delete('/api/tickets/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, message: 'Ticket deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Start server
testConnection().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 Server running at http://localhost:${PORT}`);
    console.log(`\nAPI Endpoints:`);
    console.log(`  GET    /api/tickets`);
    console.log(`  GET    /api/tickets/:id`);
    console.log(`  POST   /api/tickets`);
    console.log(`  PATCH  /api/tickets/:id`);
    console.log(`  DELETE /api/tickets/:id`);
    console.log(`  GET    /api/health\n`);
  });
});
