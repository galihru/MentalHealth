-module(mini_waf).
-export([check_request/1]).

check_request(Req) ->
    case has_sql_injection(Req) of
        true -> {block, sql_injection};
        false ->
            case has_xss(Req) of
                true -> {block, xss_attempt};
                false -> allow
            end
    end.

has_sql_injection(Req) ->
    Patterns = ["' OR ", "--", ";DROP TABLE", "UNION SELECT"],
    lists:any(fun(P) -> 
        binary:match(Req, list_to_binary(P)) =/= nomatch
    end, Patterns).

has_xss(Req) ->
    Patterns = ["<script>", "javascript:", "onload="],
    lists:any(fun(P) -> 
        binary:match(Req, list_to_binary(P)) =/= nomatch
    end, Patterns).
