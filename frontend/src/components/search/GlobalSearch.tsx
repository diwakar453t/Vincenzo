import { useState, useRef, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../store/store';
import { autocomplete, globalSearch, clearSearchResults } from '../../store/slices/searchSlice';
import {
    Box, InputBase, Paper, List, ListItem, ListItemIcon, ListItemText,
    Typography, Chip, CircularProgress, ClickAwayListener, Fade,
} from '@mui/material';
import {
    Search, Person, School, Class as ClassIcon, MenuBook, Close,
} from '@mui/icons-material';

const TYPE_ICONS: Record<string, React.ReactNode> = {
    student: <Person sx={{ color: '#3D5EE1' }} />,
    teacher: <School sx={{ color: '#51CF66' }} />,
    class: <ClassIcon sx={{ color: '#FCC419' }} />,
    subject: <MenuBook sx={{ color: '#9B59B6' }} />,
};
const TYPE_COLORS: Record<string, string> = { student: '#3D5EE1', teacher: '#51CF66', class: '#FCC419', subject: '#9B59B6' };

export default function GlobalSearch() {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const { results, suggestions, loading, total } = useSelector((s: RootState) => s.search);
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const doAutocomplete = useCallback((q: string) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => { if (q.length >= 1) dispatch(autocomplete(q)); }, 250);
    }, [dispatch]);

    useEffect(() => { if (!query) { dispatch(clearSearchResults()); setShowResults(false); } }, [query, dispatch]);

    const handleChange = (val: string) => {
        setQuery(val);
        setOpen(true); setShowResults(false);
        doAutocomplete(val);
    };

    const handleSearch = () => {
        if (query.length >= 1) { dispatch(globalSearch({ q: query, limit: 20 })); setShowResults(true); }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch();
        if (e.key === 'Escape') { setOpen(false); setQuery(''); dispatch(clearSearchResults()); }
    };

    const handleNavigate = (link: string) => {
        setOpen(false); setQuery(''); dispatch(clearSearchResults());
        navigate(link);
    };

    const displayItems = showResults ? results : suggestions.map(s => ({ id: s.id, type: s.type, title: s.text, subtitle: s.type, link: `/dashboard/${s.type}s/${s.id}`, icon: s.type }));

    return (
        <ClickAwayListener onClickAway={() => setOpen(false)}>
            <Box sx={{ position: 'relative', maxWidth: 420, width: '100%' }}>
                {/* Search Input */}
                <Box sx={{
                    display: 'flex', alignItems: 'center', gap: 1,
                    bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2, px: 1.5, py: 0.5,
                    border: open ? '1px solid rgba(61,94,225,0.3)' : '1px solid transparent',
                    transition: 'all 0.3s',
                }}>
                    <Search sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 20 }} />
                    <InputBase
                        inputRef={inputRef}
                        placeholder="Search students, teachers, classes…"
                        value={query} onChange={e => handleChange(e.target.value)}
                        onFocus={() => { if (query) setOpen(true); }}
                        onKeyDown={handleKeyDown}
                        sx={{ flex: 1, color: 'inherit', fontSize: 14, '& ::placeholder': { color: 'rgba(255,255,255,0.5)' } }}
                    />
                    {loading && <CircularProgress size={16} sx={{ color: 'rgba(255,255,255,0.7)' }} />}
                    {query && <Close sx={{ fontSize: 16, cursor: 'pointer', color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#fff' } }}
                        onClick={() => { setQuery(''); dispatch(clearSearchResults()); setOpen(false); }} />}
                </Box>

                {/* Dropdown */}
                <Fade in={open && query.length >= 1 && displayItems.length > 0}>
                    <Paper sx={{
                        position: 'absolute', top: '100%', left: 0, right: 0, mt: 0.5, zIndex: 1300,
                        maxHeight: 400, overflow: 'auto', borderRadius: 2,
                        boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                    }}>
                        {showResults && (
                            <Box sx={{ px: 2, py: 1, borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="caption" fontWeight={700} color="text.secondary">Results</Typography>
                                <Chip label={`${total} found`} size="small" sx={{ height: 18, fontSize: 10 }} />
                            </Box>
                        )}
                        <List sx={{ py: 0 }}>
                            {displayItems.slice(0, 10).map((item, i) => (
                                <ListItem key={`${item.type}-${item.id}-${i}`} onClick={() => handleNavigate(item.link)}
                                    sx={{ py: 1, cursor: 'pointer', '&:hover': { bgcolor: 'rgba(61,94,225,0.06)' } }}>
                                    <ListItemIcon sx={{ minWidth: 36 }}>{TYPE_ICONS[item.type] || <Search />}</ListItemIcon>
                                    <ListItemText
                                        primary={<Typography variant="body2" fontWeight={600}>{item.title}</Typography>}
                                        secondary={<Typography variant="caption" color="text.secondary">{item.subtitle}</Typography>}
                                    />
                                    <Chip label={item.type} size="small" sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: `${TYPE_COLORS[item.type] || '#888'}18`, color: TYPE_COLORS[item.type] || '#888', textTransform: 'capitalize' }} />
                                </ListItem>
                            ))}
                        </List>
                        {!showResults && query.length >= 1 && (
                            <Box sx={{ p: 1.5, borderTop: '1px solid rgba(0,0,0,0.06)', textAlign: 'center' }}>
                                <Typography variant="caption" color="primary" fontWeight={700} sx={{ cursor: 'pointer' }} onClick={handleSearch}>
                                    Press Enter for full search
                                </Typography>
                            </Box>
                        )}
                    </Paper>
                </Fade>
            </Box>
        </ClickAwayListener>
    );
}
