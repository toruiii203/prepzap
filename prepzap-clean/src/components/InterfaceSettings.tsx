import { useInterfacePreferences, saveInterfacePreferences, type ThemePreference } from "@/lib/interfacePreferences";
import { setSoundEnabled } from "@/lib/soundFX";

export function InterfaceSettings() {
  const preferences = useInterfacePreferences();
  return (
    <section aria-labelledby="interface-preferences-title" className="interface-settings">
      <h2 id="interface-preferences-title">Make yourself at home</h2>
      <p>Appearance and feedback on this device.</p>
      <label className="interface-setting-row"><span>Appearance</span>
        <select aria-label="Appearance" value={preferences.theme} onChange={event => saveInterfacePreferences({ theme: event.target.value as ThemePreference })}>
          <option value="system">Follow device</option><option value="light">Light</option><option value="dark">Dark</option>
        </select>
      </label>
      <label className="interface-setting-row"><span>Sound effects</span><input type="checkbox" role="switch" checked={preferences.sound} onChange={event => setSoundEnabled(event.target.checked)} /></label>
      <label className="interface-setting-row"><span>Vibration</span><input type="checkbox" role="switch" checked={preferences.vibration} onChange={event => saveInterfacePreferences({ vibration: event.target.checked })} /></label>
      <p className="text-sm">Vibration is optional and depends on your browser. iOS Safari uses visual feedback. Reduce Motion also turns vibration off.</p>
    </section>
  );
}
