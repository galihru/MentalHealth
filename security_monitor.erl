-module(security_monitor).
-export([start/0, log_event/2]).

start() ->
    spawn(fun() -> 
        ets:new(security_events, [ordered_set, public, named_table]),
        monitor_loop()
    end).

log_event(Type, Details) ->
    Timestamp = os:system_time(millisecond),
    ets:insert(security_events, {Timestamp, Type, Details}).

monitor_loop() ->
    receive
        {analyze, From} ->
            Suspicious = ets:match_object(security_events, {'_', brute_force, '_'}),
            From ! {analysis, length(Suspicious)},
            monitor_loop()
    after 5000 ->
        % Auto-report setiap 5 detik
        report_anomalies(),
        monitor_loop()
    end.

report_anomalies() ->
    case ets:info(security_events, size) > 100 of
        true -> 
            % Kirim notifikasi ke Slack/Email
            slack_alert("High activity detected!");
        false -> ok
    end.
