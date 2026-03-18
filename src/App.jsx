import React, { useState } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  AppBar,
  Toolbar,
  Grid,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CodeIcon from '@mui/icons-material/Code';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import TerminalIcon from '@mui/icons-material/Terminal';

import './App.css'; // Extract styles here
import { parseDSL, executeAST, generateCode } from './engine';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#2563eb' },
    secondary: { main: '#10b981' },
    background: { default: '#f8fafc', paper: '#ffffff' },
    text: { primary: '#1e293b', secondary: '#475569' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiButton: {
      styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } },
    },
  },
});

export default function App() {
  const [dslCode, setDslCode] = useState(
    '{\n  A != 0\n} [\n  { B != 0 } [\n    X = -C/A; stop\n  ]\n]',
  );
  const [contextInput, setContextInput] = useState(
    '{\n  "A": 1,\n  "B": -5,\n  "C": 6\n}',
  );
  const [astOutput, setAstOutput] = useState(null);
  const [executionResult, setExecutionResult] = useState(null);
  const [jsCodeOutput, setJsCodeOutput] = useState('');
  const [error, setError] = useState('');

  const handleRun = () => {
    setError('');
    setAstOutput(null);
    setExecutionResult(null);
    setJsCodeOutput('');

    try {
      const context = JSON.parse(contextInput);
      const ast = parseDSL(dslCode);
      setAstOutput(ast);

      const contextForExecution = JSON.parse(JSON.stringify(context));
      const test = executeAST(ast, contextForExecution);
      setExecutionResult(test);

      const generated = generateCode(ast);
      setJsCodeOutput(generated);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <Box className="app-container">
        <AppBar position="static" elevation={0} className="app-bar">
          <Toolbar variant="dense">
            <AccountTreeIcon className="app-bar-icon" />
            <Typography variant="h6" component="div" className="app-bar-title">
              Предикатний Рушій
            </Typography>
          </Toolbar>
        </AppBar>

        <Box className="main-content">
          <Grid container spacing={2} className="top-section-grid">
            <Grid size={{ xs: 12, md: 6 }} className="grid-item-height">
              <Paper elevation={2} className="panel panel-top">
                <Box className="panel-header panel-header-bg-slate">
                  <CodeIcon fontSize="small" className="panel-icon" />
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    fontWeight="bold"
                  >
                    Правила (DSL)
                  </Typography>
                </Box>
                <TextField
                  multiline
                  fullWidth
                  value={dslCode}
                  onChange={(e) => setDslCode(e.target.value)}
                  variant="standard"
                  className="text-field-container"
                  InputProps={{
                    disableUnderline: true,
                  }}
                />
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }} className="grid-item-height">
              <Paper elevation={2} className="panel panel-top">
                <Box className="panel-header panel-header-bg-slate">
                  <TerminalIcon fontSize="small" className="panel-icon" />
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    fontWeight="bold"
                  >
                    Вхідний контекст (JSON)
                  </Typography>
                </Box>
                <TextField
                  multiline
                  fullWidth
                  value={contextInput}
                  onChange={(e) => setContextInput(e.target.value)}
                  variant="standard"
                  className="text-field-container"
                  InputProps={{
                    disableUnderline: true,
                  }}
                />
              </Paper>
            </Grid>
          </Grid>

          <Box className="actions-container">
            <Button
              variant="contained"
              color="primary"
              onClick={handleRun}
              startIcon={<PlayArrowIcon />}
              className="run-btn"
            >
              Запустити рушій
            </Button>
            {error && (
              <Alert severity="error" variant="filled" className="alert-error">
                {error}
              </Alert>
            )}
          </Box>

          <Grid container spacing={2} className="bottom-section-grid">
            <Grid size={{ xs: 12, md: 4 }} className="grid-item-height">
              <Paper elevation={2} className="panel panel-bottom panel-ast">
                <Box className="panel-header panel-header-bg-light">
                  <Typography
                    variant="subtitle2"
                    fontWeight="bold"
                    color="text.primary"
                  >
                    1. Згенероване AST
                  </Typography>
                </Box>
                <Box className="panel-content panel-content-white">
                  <pre className="pre-code pre-code-ast">
                    {astOutput
                      ? JSON.stringify(astOutput, null, 2)
                      : 'Поки пусто...'}
                  </pre>
                </Box>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }} className="grid-item-height">
              <Paper elevation={2} className="panel panel-bottom panel-result">
                <Box className="panel-header panel-header-bg-green">
                  <Typography
                    variant="subtitle2"
                    fontWeight="bold"
                    color="#047857"
                  >
                    2. Результат виконання
                  </Typography>
                </Box>
                <Box className="panel-content panel-content-green">
                  <pre className="pre-code pre-code-result">
                    {executionResult
                      ? JSON.stringify(executionResult, null, 2)
                      : 'Поки пусто...'}
                  </pre>
                </Box>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }} className="grid-item-height">
              <Paper elevation={2} className="panel panel-bottom panel-code">
                <Box className="panel-header panel-header-bg-blue">
                  <Typography
                    variant="subtitle2"
                    fontWeight="bold"
                    color="#1d4ed8"
                  >
                    3. JS Код Автомата
                  </Typography>
                </Box>
                <Box className="panel-content panel-content-blue">
                  <pre className="pre-code pre-code-js">
                    {jsCodeOutput || 'Поки пусто...'}
                  </pre>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
