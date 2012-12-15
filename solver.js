$(function(){
    var GraphNode = function(id, name) {
        this.id = id;
        this.name = name;
    }

    var GraphEdgeCost = function(time, trans) {
        this.time = time;
        this.trans = trans;
    }

    GraphEdgeCost.prototype.add = function(rhs) {
        var result = new GraphEdgeCost(this.time, this.trans);
        result.time += rhs.time;
        result.trans += rhs.trans;
        return result;
    }

    var GraphEdge = function(from, to, time, trans) {
        this.from = from;
        this.to = to;
        this.cost = new GraphEdgeCost(time, trans);
    }

    var GraphPath = function(dest) {
        this.total_cost = new GraphEdgeCost(0, 0);
        this.list = [dest];
        this.head = dest;
    }

    GraphPath.prototype.add = function(from, cost) {
        this.total_cost = this.total_cost.add(cost);
        this.list.push(from);
        this.head = from;
    }

    GraphPath.prototype.clone = function() {
        var result = new GraphPath(this.list[0]);
        var i;
        result.total_cost = this.total_cost;
        for (i = 1; i < this.list.length; i++)
            result.list.push(this.list[i]);
        result.head = this.head;
        return result;
    }

    var Graph = function() {
        this.nodes = [];
        this.edges = [];
        this.nodes_head = null;
        this.edges_head = null;
        this.nodes_dic = {};
        this.reformed = true;
    }

    Graph.prototype.addNode = function(id, name) {
        this.nodes.push(new GraphNode(id, name));
        this.nodes_dic[id] = name;
        this.reformed = false;
    }

    Graph.prototype.addEdge = function(from, to, time, trans) {
        this.edges.push(new GraphEdge(from, to, time, trans));
        this.reformed = false;
    }

    Graph.prototype.reform = function() {
        var base, range;
        var i, j;

        this.nodes.sort(function(a, b) { return a.name.localeCompare(b.name); });
        for (base = 0; base < this.nodes.length; base++) {
            for (range = base + 1; range < this.nodes.length; range++) {
                if (this.nodes[base].name !== this.nodes[range].name)
                    break;
            }
            for (i = base; i < range - 1; i++) {
                for (j = i + 1; j < range; j++) {
                    this.edges.push(new GraphEdge(this.nodes[i].id, this.nodes[j].id, 5, 1));
                    this.edges.push(new GraphEdge(this.nodes[j].id, this.nodes[i].id, 5, 1));
                }
            }
            base = range - 1;
        }

        this.edges.sort(function(a, b) { return a.from - b.from; });

        this.nodes_head = {};
        for (i = this.nodes.length - 1; i >= 0; i--) {
            this.nodes_head[this.nodes[i].name] = i;
        }

        this.edges_head = {};
        for (i = this.edges.length - 1; i >= 0; i--) {
            this.edges_head[this.edges[i].from] = i;
        }

        this.reformed = true;
    }

    Graph.prototype.findShortestInternal = function(src_set, dest_set, trans_priority) {
        var comparator;
        if (trans_priority) {
            comparator = function(a, b) {
                if (a.trans == b.trans)
                    return a.time - b.time;
                else
                    return a.trans - b.trans;
            }
        } else {
            comparator = function(a, b) {
                return a.time - b.time;
            }
        }

        var visited = {};
        var candidate = {};
        var backtrace = {};
        var shortest = undefined;
        var shortest_dest;
        var i, j;

        for (i = 0; i < src_set.length; i++) {
            candidate[src_set[i]] = new GraphEdgeCost(0, 0);
            backtrace[src_set[i]] = {};
        }

        while (true) {
            var min = undefined;
            var min_key;
            for (var key in candidate) {
                if (candidate.hasOwnProperty(key)) {
                    if (min == undefined || comparator(min, candidate[key]) > 0) {
                        min = candidate[key];
                        min_key = key;
                    }
                }
            }
            if (min == undefined)
                break;
            if ($.inArray(min_key, dest_set) >= 0) {
                if (shortest == undefined) {
                    shortest = min;
                    shortest_dest = [min_key];
                    if (shortest_dest.length == dest_set.length)
                        break;
                } else {
                    var c = comparator(shortest, min);
                    if (c == 0) {
                        shortest_dest.push(min_key);
                    } else if (c < 0) {
                        break;
                    }
                }
            }

            delete candidate[min_key];
            visited[min_key] = 1;

            var from = min_key;
            if (!(from in this.edges_head))
                continue;
            for (i = this.edges_head[from]; i < this.edges.length; i++) {
                if (this.edges[i].from != from) continue;
                var to = this.edges[i].to;
                var cost = this.edges[i].cost;
                if (visited[to]) continue;
                if (to in candidate) {
                    var c = comparator(candidate[to], min.add(cost));
                    if (c > 0) {
                        candidate[to] = min.add(cost);
                        backtrace[to] = [[from, cost]];
                    } else if (c == 0) {
                        backtrace[to].push([from, cost]);
                    }
                } else {
                    candidate[to] = min.add(cost);
                    backtrace[to] = [[from, cost]];
                }
            }
        }

        var result = [];
        for (i = 0; i < shortest_dest.length; i++) {
            result.push(new GraphPath(shortest_dest[i]));
        }

        while (true) {
            var updated = false;
            for (i = 0; i < result.length; i++) {
                if ($.inArray(result[i].head, src_set) == -1) {
                    var head = result[i].head;
                    for (j = 1; j < backtrace[head].length; j++) {
                        var new_path = result[i].clone();
                        new_path.add(backtrace[head][j][0], backtrace[head][j][1]);
                        result.push(new_path);
                    }
                    result[i].add(backtrace[head][0][0], backtrace[head][0][1]);
                    updated = true;
                }
            }
            if (!updated)
                break;
        }

        return result;
    }

    Graph.prototype.findShortest = function(from, to, trans_priority) {
        var from_id = [];
        var to_id = [];
        var i, j;

        if (!this.reformed)
            return '';

        if (from == '')
            return '출발역을 입력하십시오.';
        if (to == '')
            return '도착역을 입력하십시오.';
        if (!(from in this.nodes_head))
            return '[' + from + '] 역이 존재하지 않습니다.';
        if (!(to in this.nodes_head))
            return '[' + to + '] 역이 존재하지 않습니다.';

        for (i = this.nodes_head[from]; i < this.nodes.length; i++) {
            if (this.nodes[i].name != from) break;
            from_id.push(this.nodes[i].id);
        }
        for (i = this.nodes_head[to]; i < this.nodes.length; i++) {
            if (this.nodes[i].name != to) break;
            to_id.push(this.nodes[i].id);
        }

        return this.findShortestInternal(from_id, to_id, trans_priority);
    }

    Graph.prototype.pathToString = function(path) {
        var result;
        var i;
        result = '(' + path.total_cost.time.toString() + '분, 환승 ' + path.total_cost.trans.toString() + '번)';
        for (i = path.list.length - 1; i >= 0; i--) {
            var my_name = this.nodes_dic[path.list[i]];
            var prev_name = this.nodes_dic[path.list[i - 1]];
            if (my_name == prev_name) {
                result += ' [' + my_name + ']';
                while (i >= 0 && my_name == prev_name) {
                    i--;
                    prev_name = this.nodes_dic[path.list[i - 1]];
                }
            } else {
                result += ' ' + my_name;
            }
        }
        return result;
    }

    var graph = {};

    function registerData(region, data) {
        var i_parts = data.split('\n\n');
        var i_stations = i_parts[0].split('\n');
        var i_intervals = i_parts[1].split('\n');
        var i;

        graph[region] = new Graph();
        for (i = 0; i < i_stations.length; i++) {
            if (i_stations[i] == '') continue;
            var i_station_parts = i_stations[i].split(' ');
            graph[region].addNode(i_station_parts[0], i_station_parts[1]);
        }
        for (i = 0; i < i_intervals.length; i++) {
            if (i_intervals[i] == '') continue;
            var i_interval_parts = i_intervals[i].split(' ');
            graph[region].addEdge(i_interval_parts[0], i_interval_parts[1], parseInt(i_interval_parts[2], 10), 0);
        }

        graph[region].reform();
    }

    $.ajax({
        url: "master/output/seoul.utf8.txt",
        success: function(data) {
            registerData('seoul', data);
        }
    });

    $.ajax({
        url: "master/output/busan.utf8.txt",
        success: function(data) {
            registerData('busan', data);
        }
    });

    $('form').submit(function() {
        var region = $('select[name=region]').val();
        var from = $('input[name=from]').val();
        var to = $('input[name=to]').val();
        var trans_priority = $('input[name=transfer]').is(':checked');
        var result = graph[region].findShortest(from, to, trans_priority);
        if (typeof result == 'string')
            $('#result').html('<p>' + result + '</p>');
        else {
            var ul = $('<ul></ul>');
            for (var i = 0; i < result.length; i++) {
                var li = $('<li></li>').html(graph[region].pathToString(result[i]));
                ul.append(li);
            }
            $('#result').html(ul);
        }
        return false;
    });
});
