/**
 * ### Базовый класс элементов построителя
 * &copy; Evgeniy Malyarov http://www.oknosoft.ru 2014-2017
 *
 * Created 24.07.2015
 *
 * @module geometry
 * @submodule element
 */


/**
 * ### Базовый класс элементов построителя
 * Унаследован от [paper.Group](http://paperjs.org/reference/group/). Cвойства и методы `BuilderElement` присущи всем элементам построителя,
 * но не характерны для классов [Path](http://paperjs.org/reference/path/) и [Group](http://paperjs.org/reference/group/) фреймворка [paper.js](http://paperjs.org/about/),
 * т.к. описывают не линию и не коллекцию графических примитивов, а элемент конструкции с определенной физикой и поведением
 *
 * @class BuilderElement
 * @param attr {Object} - объект со свойствами создаваемого элемента
 *  @param attr.b {paper.Point} - координата узла начала элемента - не путать с координатами вершин пути элемента
 *  @param attr.e {paper.Point} - координата узла конца элемента - не путать с координатами вершин пути элемента
 *  @param attr.contour {Contour} - контур, которому принадлежит элемент
 *  @param attr.type_el {_enm.elm_types}  может измениться при конструировании. например, импост -> рама
 *  @param [attr.inset] {_cat.inserts} -  вставка элемента. если не указано, будет вычислена по типу элемента
 *  @param [attr.path] (r && arc_ccw && more_180)
 * @constructor
 * @extends paper.Group
 * @menuorder 40
 * @tooltip Элемент изделия
 */
function BuilderElement(attr){

	BuilderElement.superclass.constructor.call(this);

	if(!attr.row){
    attr.row = this.project.ox.coordinates.add();
  }

	this._row = attr.row;

	if(attr.proto){

		if(attr.proto.inset){
      this.inset = attr.proto.inset;
    }

		if(attr.parent){
      this.parent = attr.parent;
    }
		else if(attr.proto.parent){
      this.parent = attr.proto.parent;
    }

		if(attr.proto instanceof Profile){
      this.insertBelow(attr.proto);
    }

		this.clr = attr.proto.clr;

	}
	else if(attr.parent){
    this.parent = attr.parent;
  }

	if(!this._row.cnstr && this.layer.cnstr){
    this._row.cnstr = this.layer.cnstr;
  }

	if(!this._row.elm){
    this._row.elm = this.project.ox.coordinates.aggregate([], ["elm"], "max") + 1;
  }

	if(this._row.elm_type.empty() && !this.inset.empty()){
    this._row.elm_type = this.inset.nom().elm_type;
  }

	this.project.register_change();


}

// BuilderElement наследует свойства класса Group
BuilderElement._extend(paper.Group);

// Привязываем свойства номенклатуры, вставки и цвета
BuilderElement.prototype.__define({

	/**
	 * ### Элемент - владелец
	 * имеет смысл для раскладок и рёбер заполнения
	 * @property owner
	 * @type BuilderElement
	 */
	owner: {
		get : function(){ return this.data.owner; },
		set : function(v){ this.data.owner = v; }
	},

	/**
	 * ### Образующая
	 * прочитать - установить путь образующей. здесь может быть линия, простая дуга или безье
	 * по ней будут пересчитаны pathData и прочие свойства
	 * @property generatrix
	 * @type paper.Path
	 */
	generatrix: {
		get : function(){ return this.data.generatrix; },
		set : function(attr){

			this.data.generatrix.removeSegments();

			if(this.hasOwnProperty('rays'))
				this.rays.clear();

			if(Array.isArray(attr))
				this.data.generatrix.addSegments(attr);

			else if(attr.proto &&  attr.p1 &&  attr.p2){

				// сначала, выясняем направление пути
				var tpath = attr.proto;
				if(tpath.getDirectedAngle(attr.ipoint) < 0)
					tpath.reverse();

				// далее, уточняем порядок p1, p2
				var d1 = tpath.getOffsetOf(attr.p1),
					d2 = tpath.getOffsetOf(attr.p2), d3;
				if(d1 > d2){
					d3 = d2;
					d2 = d1;
					d1 = d3;
				}
				if(d1 > 0){
					tpath = tpath.split(d1);
					d2 = tpath.getOffsetOf(attr.p2);
				}
				if(d2 < tpath.length)
					tpath.split(d2);

				this.data.generatrix.remove();
				this.data.generatrix = tpath;
				this.data.generatrix.parent = this;

				if(this.parent.parent)
					this.data.generatrix.guide = true;
			}
		},
		enumerable : true
	},

	/**
	 * путь элемента - состоит из кривых, соединяющих вершины элемента
	 * для профиля, вершин всегда 4, для заполнений может быть <> 4
	 * @property path
	 * @type paper.Path
	 */
	path: {
		get : function(){ return this.data.path; },
		set : function(attr){
			if(attr instanceof paper.Path){
				this.data.path.removeSegments();
				this.data.path.addSegments(attr.segments);
				if(!this.data.path.closed)
					this.data.path.closePath(true);
			}
		},
		enumerable : true
	},

	// виртуальные метаданные для автоформ
	_metadata: {
		get : function(){
			const t = this,
				_meta = t.project.ox._metadata,
				_xfields = _meta.tabular_sections.coordinates.fields, //_dgfields = t.project._dp._metadata.fields
				inset = Object.assign({}, _xfields.inset),
        arc_h = Object.assign({}, _xfields.r, {synonym: "Высота дуги"}),
        info = Object.assign({}, _meta.fields.note, {synonym: "Элемент"}),
				cnn1 = Object.assign({}, _meta.tabular_sections.cnn_elmnts.fields.cnn),
				cnn2 = Object.assign({}, cnn1),
				cnn3 = Object.assign({}, cnn1);

			function cnn_choice_links(o, cnn_point){

				const nom_cnns = $p.cat.cnns.nom_cnn(t, cnn_point.profile, cnn_point.cnn_types);

				if($p.utils.is_data_obj(o)){
					return nom_cnns.some((cnn) => o == cnn);
				}
				else{
					let refs = "";
					nom_cnns.forEach((cnn) => {
						if(refs){
              refs += ", ";
            }
						refs += "'" + cnn.ref + "'";
					});
					return "_t_.ref in (" + refs + ")";
				}
			}


			// динамические отборы для вставок и соединений

			inset.choice_links = [{
				name: ["selection",	"ref"],
				path: [
					function(o, f){
						let selection;

						if(t instanceof Filling){
							if($p.utils.is_data_obj(o)){
								return $p.cat.inserts._inserts_types_filling.indexOf(o.insert_type) != -1 &&
										o.thickness >= t.project._dp.sys.tmin && o.thickness <= t.project._dp.sys.tmax;
							}
							else{
								let refs = "";
								$p.cat.inserts.by_thickness(t.project._dp.sys.tmin, t.project._dp.sys.tmax).forEach((row) => {
									if(refs){
                    refs += ", ";
                  }
									refs += "'" + row.ref + "'";
								});
								return "_t_.ref in (" + refs + ")";
							}
						}
						else if(t instanceof Profile){
							if(t.nearest()){
                selection = {elm_type: {in: [$p.enm.elm_types.Створка, $p.enm.elm_types.Добор]}};
              }
							else{
                selection = {elm_type: {in: [$p.enm.elm_types.Рама, $p.enm.elm_types.Импост, $p.enm.elm_types.Добор]}};
              }
						}
						else{
              selection = {elm_type: t.nom.elm_type};
            }

						if($p.utils.is_data_obj(o)){
							let ok = false;
							selection.nom = o;
							t.project._dp.sys.elmnts.find_rows(selection, (row) => {
								ok = true;
								return false;
							});
							return ok;
						}else{
							let refs = "";
							t.project._dp.sys.elmnts.find_rows(selection, (row) => {
								if(refs){
                  refs += ", ";
                }
								refs += "'" + row.nom.ref + "'";
							});
							return "_t_.ref in (" + refs + ")";
						}
				}]}
			];

			cnn1.choice_links = [{
				name: ["selection",	"ref"],
				path: [
					function(o, f){
						return cnn_choice_links(o, t.rays.b);
					}]}
			];

			cnn2.choice_links = [{
				name: ["selection",	"ref"],
				path: [
					function(o, f){
						return cnn_choice_links(o, t.rays.e);
					}]}
			];

			cnn3.choice_links = [{
				name: ["selection",	"ref"],
				path: [
					function(o){

						const cnn_ii = t.selected_cnn_ii();
						let nom_cnns;

						if(cnn_ii.elm instanceof Filling){
              nom_cnns = $p.cat.cnns.nom_cnn(cnn_ii.elm, t, $p.enm.cnn_types.acn.ii);
            }
						else if(cnn_ii.elm_type == $p.enm.elm_types.Створка && t.elm_type != $p.enm.elm_types.Створка){
              nom_cnns = $p.cat.cnns.nom_cnn(cnn_ii.elm, t, $p.enm.cnn_types.acn.ii);
            }
						else{
              nom_cnns = $p.cat.cnns.nom_cnn(t, cnn_ii.elm, $p.enm.cnn_types.acn.ii);
            }

						if($p.utils.is_data_obj(o)){
							return nom_cnns.some((cnn) => o == cnn);
						}
						else{
							var refs = "";
							nom_cnns.forEach(function (cnn) {
								if(refs)
									refs += ", ";
								refs += "'" + cnn.ref + "'";
							});
							return "_t_.ref in (" + refs + ")";
						}
					}]}
			];

			// дополняем свойства поля цвет отбором по служебным цветам
			$p.cat.clrs.selection_exclude_service(_xfields.clr, t);

			return {
				fields: {
					info: info,
					inset: inset,
					clr: _xfields.clr,
					x1: _xfields.x1,
					x2: _xfields.x2,
					y1: _xfields.y1,
					y2: _xfields.y2,
					cnn1: cnn1,
					cnn2: cnn2,
					cnn3: cnn3,
          arc_h: arc_h,
          r: _xfields.r,
          arc_ccw: _xfields.arc_ccw
				}
			};
		}
	},

	// виртуальный датаменеджер для автоформ
	_manager: {
		get: function () {
			return this.project._dp._manager;
		}
	},

	// номенклатура - свойство только для чтения, т.к. вычисляется во вставке
	nom:{
		get : function(){
			return this.inset.nom(this);
		}
	},

	// номер элемента - свойство только для чтения
	elm: {
		get : function(){
			return this._row ? this._row.elm : 0;
		}
	},

	// информация для редактора свойста
	info: {
		get : function(){
			return "№" + this.elm;
		},
		enumerable : true
	},

	// вставка
	inset: {
		get : function(){
			return (this._row ? this._row.inset : null) || $p.cat.inserts.get();
		},
		set : function(v){
			this.set_inset(v);
		}
	},

  // виртуальная ссылка
  ref: {
    get : function(){
      return this.inset.ref;
    },
  },

  /**
   * Сеттер вставки с учетом выделенных элементов
   * @param v {CatInserts}
   */
  set_inset: {
	  value: function(v){
      if(this._row.inset != v){
        this._row.inset = v;
        if(this.data && this.data._rays){
          this.data._rays.clear(true);
        }
        this.project.register_change();
      }
    }
  },

	// цвет элемента
	clr: {
		get : function(){
			return this._row.clr;
		},
		set : function(v){
			this.set_clr(v);
		}
	},

  /**
   * Сеттер цвета элемента
   * @param v {CatClrs}
   */
  set_clr: {
    value: function (v) {
      this._row.clr = v;
      // цвет элементу присваиваем только если он уже нарисован
      if(this.path instanceof paper.Path){
        this.path.fillColor = BuilderElement.clr_by_clr.call(this, this._row.clr, false);
      }
      this.project.register_change();
    }
  },

	// ширина
	width: {
		get : function(){
			return this.nom.width || 80;
		}
	},

	// толщина (для заполнений и, возможно, профилей в 3D)
	thickness: {
		get : function(){
			return this.inset.thickness;
		}
	},

	// опорный размер (0 для рам и створок, 1/2 ширины для импостов)
	sizeb: {
		get : function(){
			return this.inset.sizeb || 0;
		}
	},

	// размер до фурнитурного паза
	sizefurn: {
		get : function(){
			return this.nom.sizefurn || 20;
		}
	},

	/**
	 * Примыкающее соединение для диалога свойств
	 */
	cnn3: {
		get : function(){
			const cnn_ii = this.selected_cnn_ii();
			return cnn_ii ? cnn_ii.row.cnn : $p.cat.cnns.get();
		},
		set: function(v){
      const cnn_ii = this.selected_cnn_ii();
			if(cnn_ii && cnn_ii.row.cnn != v){
        cnn_ii.row.cnn = v;
        if(this.data._nearest_cnn){
          this.data._nearest_cnn = cnn_ii.row.cnn;
        }
        if(this.rays){
          this.rays.clear();
        }
        this.project.register_change();
      }
		}
	},

	/**
	 * Подключает окно редактор свойств текущего элемента, выбранного инструментом
	 */
	attache_wnd: {
		value: function(cell){

			if(!this.data._grid || !this.data._grid.cell){

				this.data._grid = cell.attachHeadFields({
					obj: this,
					oxml: this.oxml
				});
				this.data._grid.attachEvent("onRowSelect", function(id){
					if(["x1","y1","cnn1"].indexOf(id) != -1)
						this._obj.select_node("b");

					else if(["x2","y2","cnn2"].indexOf(id) != -1)
						this._obj.select_node("e");
				});

			}else{
				if(this.data._grid._obj != this)
					this.data._grid.attach({
						obj: this,
						oxml: this.oxml
					});
			}

			// cell.layout.base.style.height = (Math.max(this.data._grid.rowsBuffer.length, 9) + 1) * 22 + "px";
			// cell.layout.setSizes();
			// this.data._grid.objBox.style.width = "100%";
		}
	},

	/**
	 * Отключает и выгружает из памяти окно свойств элемента
	 */
	detache_wnd: {
		value: function(){
			if(this.data._grid && this.data._grid.destructor){
				this.data._grid._owner_cell.detachObject(true);
				delete this.data._grid;
			}
		}
	},

  /**
   * Возвращает примыкающий элемент и строку табчасти соединений
   */
	selected_cnn_ii: {
		value: function(){
		  const {project, elm} = this;
			const sel = project.getSelectedItems();
      const {cnns} = project.connections;
      const items = [];
			let res;

			sel.forEach((item) => {
				if(item.parent instanceof ProfileItem || item.parent instanceof Filling)
					items.push(item.parent);
				else if(item instanceof Filling)
					items.push(item);
			});

			if(items.length > 1 &&
				items.some((item) => item == this) &&
				items.some((item) => {
					if(item != this){
						cnns.forEach((row) => {
							if(!row.node1 && !row.node2 &&
								((row.elm1 == elm && row.elm2 == item.elm) || (row.elm1 == item.elm && row.elm2 == elm))){
								res = {elm: item, row: row};
								return false;
							}
						});
						if(res){
              return true;
            }
					}
				})){
        return res;
      }
		}
	},

  /**
   * ### Удаляет элемент из контура и иерархии проекта
   * Одновлеменно, удаляет строку из табчасти табчасти _Координаты_ и отключает наблюдателя
   * @method remove
   */
  remove: {
	  value: function () {

      this.detache_wnd();

      if(this.parent){
        if (this.parent.on_remove_elm){
          this.parent.on_remove_elm(this);
        }
        if (this.parent._noti && this._observer){
          Object.unobserve(this.parent._noti, this._observer);
          delete this._observer;
        }
      }

      if(this.project.ox === this._row._owner._owner){
        this._row._owner.del(this._row);
      }

      BuilderElement.superclass.remove.call(this);
      this.project.register_change();
    }
  }

});

BuilderElement.clr_by_clr = function (clr, view_out) {

	var clr_str = clr.clr_str;

	if(!view_out){
		if(!clr.clr_in.empty() && clr.clr_in.clr_str)
			clr_str = clr.clr_in.clr_str;
	}else{
		if(!clr.clr_out.empty() && clr.clr_out.clr_str)
			clr_str = clr.clr_out.clr_str;
	}

	if(!clr_str){
    clr_str = this.default_clr_str ? this.default_clr_str : "fff";
  }

	if(clr_str){
		clr = clr_str.split(",");
		if(clr.length == 1){
			if(clr_str[0] != "#")
				clr_str = "#" + clr_str;
			clr = new paper.Color(clr_str);
			clr.alpha = 0.96;

		}else if(clr.length == 4){
			clr = new paper.Color(clr[0], clr[1], clr[2], clr[3]);

		}else if(clr.length == 3){
			if(this.path && this.path.bounds)
				clr = new paper.Color({
					stops: [clr[0], clr[1], clr[2]],
					origin: this.path.bounds.bottomLeft,
					destination: this.path.bounds.topRight
				});
			else
				clr = new paper.Color(clr[0]);
		}
		return clr;
	}
};

Editor.BuilderElement = BuilderElement;

