-module(ip_blocker).
-behaviour(gen_server).
-export([start_link/0, block_ip/1, check_ip/1]).
-export([init/1, handle_call/3, handle_cast/2]).

-record(state, {blacklist = sets:new()}).

start_link() -> 
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

block_ip(IP) ->
    gen_server:cast(?MODULE, {block, IP}).

check_ip(IP) ->
    gen_server:call(?MODULE, {check, IP}).

init([]) ->
    {ok, #state{}}.

handle_call({check, IP}, _From, State) ->
    IsBlocked = sets:is_element(IP, State#state.blacklist),
    {reply, IsBlocked, State}.

handle_cast({block, IP}, State) ->
    NewBlacklist = sets:add_element(IP, State#state.blacklist),
    {noreply, State#state{blacklist = NewBlacklist}}.
