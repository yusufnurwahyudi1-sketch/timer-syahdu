import { useEffect, useState, useRef, useCallback } from 'react';
import { Maximize, Minimize, Moon, Sun, Settings2, Play, Pause, Square, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useTheme } from 'next-themes';
import { ThemeProvider } from './components/theme-provider';
import { audio } from './lib/audio';
import { Button } from './components/ui/button';
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Slider } from './components/ui/slider';
import { Switch } from './components/ui/switch';

const MODES = {
  pomodoro: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
  custom: 60 * 60, // Default custom 1h
};

type Mode = keyof typeof MODES;

function TimerApp() {
  const [mode, setMode] = useState<Mode>('pomodoro');
  const [customMinutes, setCustomMinutes] = useState(60);
  const [timeLeft, setTimeLeft] = useState(MODES.pomodoro);
  const [isActive, setIsActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState([50]);
  const [noiseEnabled, setNoiseEnabled] = useState(false);
  const { theme, setTheme } = useTheme();

  // Handle Fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const [timerEnd, setTimerEnd] = useState<number | null>(null);

  // Timer Logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isActive && timerEnd) {
      interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((timerEnd - now) / 1000));
        setTimeLeft(remaining);

        if (remaining <= 0) {
          setIsActive(false);
          setTimerEnd(null);
          audio.playChime();
        }
      }, 200); // Check more frequently for better precision
    } else if (!isActive && timerEnd !== null) {
      // Pause
      setTimerEnd(null);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timerEnd]);

  const toggleTimer = () => {
    audio.init();
    if (!isActive) {
      setTimerEnd(Date.now() + timeLeft * 1000);
      setIsActive(true);
    } else {
      setIsActive(false);
      setTimerEnd(null);
    }
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimerEnd(null);
    setTimeLeft(MODES[mode]);
  };

  const handleModeChange = (newMode: string) => {
    const m = newMode as Mode;
    setMode(m);
    setTimeLeft(MODES[m]);
    setIsActive(false);
    setTimerEnd(null);
  };

  // Handle noise
  useEffect(() => {
    if (noiseEnabled) {
      audio.playBackgroundNoise(volume[0] / 100);
    } else {
      audio.stopBackgroundNoise();
    }
  }, [noiseEnabled]);

  useEffect(() => {
    if (noiseEnabled) {
      audio.setVolume(volume[0] / 100);
    }
  }, [volume, noiseEnabled]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center transition-colors duration-500 relative">
      
      {/* Top Controls */}
      <div className="absolute top-6 right-6 flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleFullscreen}
          className="rounded-full text-muted-foreground hover:text-foreground"
        >
          {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="rounded-full text-muted-foreground hover:text-foreground"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>
        
        <Dialog>
          <DialogTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-muted-foreground hover:text-foreground"
              />
            }
          >
            <Settings2 className="w-5 h-5" />
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Settings</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="flex flex-col gap-4">
                <div>
                  <h4 className="text-sm font-medium leading-none">Custom Timer Duration ({customMinutes}m)</h4>
                  <p className="text-sm text-muted-foreground">Adjust the duration for the Custom focus mode.</p>
                </div>
                <Slider 
                  value={[customMinutes]}
                  onValueChange={(val) => {
                    setCustomMinutes(val[0]);
                    MODES.custom = val[0] * 60;
                    if (mode === 'custom' && !isActive) {
                      setTimeLeft(val[0] * 60);
                    }
                  }}
                  min={1}
                  max={120}
                  step={1}
                />
              </div>
              <div className="h-px bg-border my-2" />
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium leading-none">Ambient Sound</h4>
                  <p className="text-sm text-muted-foreground">Play continuous brown noise to block distractions.</p>
                </div>
                <Switch 
                  checked={noiseEnabled}
                  onCheckedChange={setNoiseEnabled}
                />
              </div>
              {noiseEnabled && (
                <div className="flex items-center gap-4">
                  <VolumeX className="w-4 h-4 text-muted-foreground" />
                  <Slider 
                    value={volume}
                    onValueChange={setVolume}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <Volume2 className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Timer App */}
      <div className="flex flex-col items-center gap-12 w-full max-w-3xl px-6">
        
        <Tabs value={mode} onValueChange={handleModeChange} className="w-full max-w-[500px]">
          <TabsList className="grid w-full grid-cols-4 rounded-full">
            <TabsTrigger value="pomodoro" className="rounded-full">Focus</TabsTrigger>
            <TabsTrigger value="shortBreak" className="rounded-full">Short</TabsTrigger>
            <TabsTrigger value="longBreak" className="rounded-full">Long</TabsTrigger>
            <TabsTrigger value="custom" className="rounded-full">Custom</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="font-mono text-[20vw] md:text-[min(18vw,240px)] font-bold tracking-tighter tabular-nums leading-none cursor-default drop-shadow-sm select-none">
          {formatTime(timeLeft)}
        </div>

        <div className="flex items-center gap-4">
          <Button 
            size="lg"
            variant={isActive ? "secondary" : "default"}
            className="w-32 h-16 rounded-full text-lg shadow-lg hover:shadow-xl transition-all"
            onClick={toggleTimer}
          >
            {isActive ? (
              <><Pause className="w-6 h-6 mr-2" fill="currentColor"/> Pause</>
            ) : (
              <><Play className="w-6 h-6 mr-2" fill="currentColor"/> Start</>
            )}
          </Button>

          <Button 
            size="icon" 
            variant="outline" 
            className="w-16 h-16 rounded-full"
            onClick={resetTimer}
          >
            <RotateCcw className="w-6 h-6" />
          </Button>
        </div>

      </div>

    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TimerApp />
    </ThemeProvider>
  );
}

