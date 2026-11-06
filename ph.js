// /ph.js — PostHog, loaded AFTER the page is up so it never slows the first screen.
// Matches /privacy: counts page visits and taps; no session recordings, no surveys; never sends name or email.
// Pages call window.btpTrack("event", {props}) — calls made before PostHog loads are queued.
(function () {
  if (window.btpTrack) return;
  var q = [];
  window.btpTrack = function (name, props) {
    try { if (window.posthog && window.posthog.__loaded) window.posthog.capture(name, props || {}); else q.push([name, props || {}]); } catch (e) {}
  };
  // signed-in visitors are counted as one person across devices by their account id only (no name/email)
  window.btpIdentify = function (id) { try { if (id) { if (window.posthog && window.posthog.__loaded) window.posthog.identify(String(id)); else q.push(["$identify", id]); } } catch (e) {} };
  function boot() {
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    window.posthog.init("phc_y5nx7KMy6shKCNsrubwVmgqcryfeTsePBegPn8KKY3xC", {
      api_host: "https://us.i.posthog.com", person_profiles: "identified_only",
      disable_session_recording: true, disable_surveys: true, capture_performance: false, capture_dead_clicks: false,
      mask_all_text: false, mask_all_element_attributes: false,
      loaded: function (ph) {
        ph.__loaded = true;
        for (var i = 0; i < q.length; i++) { if (q[i][0] === "$identify") ph.identify(String(q[i][1])); else ph.capture(q[i][0], q[i][1]); }
        q = [];
      },
    });
  }
  function later() { setTimeout(boot, 1200); }
  if (document.readyState === "complete") later(); else window.addEventListener("load", later);
})();
