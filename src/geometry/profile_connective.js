/**
 *
 * &copy; Evgeniy Malyarov http://www.oknosoft.ru 2014-2017
 *
 * Created 16.05.2016
 *
 * @author	Evgeniy Malyarov
 * @module geometry
 * @submodule profile_connective
 */


/**
 * ### Соединительный профиль
 * Класс описывает поведение соединительного профиля
 *
 * - у соединительного профиля есть координаты конца и начала, такие же, как у Profile
 * - концы соединяются с пустотой
 * - имеет как минимум одно ii примыкающее соединение
 * - есть путь образующей - прямая или кривая линия, такая же, как у Profile
 * - слвиг и искривление пути передаются примыкающим профилям
 * - соединительный профиль живёт в слое одного из рамных контуров изделия, но может оказывать влияние на соединёные с ним контуры
 * - длина соединительного профиля может отличаться от длин профилей, к которым он примыкает
 *
 * @class ProfileConnective
 * @param attr {Object} - объект со свойствами создаваемого элемента см. {{#crossLink "BuilderElement"}}параметр конструктора BuilderElement{{/crossLink}}
 * @constructor
 * @extends ProfileItem
 */
class ProfileConnective extends ProfileItem {

  /**
   * Расстояние от узла до опорной линии, для соединителей и раскладок == 0
   * @property d0
   * @type Number
   */
  get d0() {
    return 0;
  }

  /**
   * Расстояние от узла до внешнего ребра элемента
   * для рамы, обычно = 0, для импоста 1/2 ширины
   * зависит от ширины элементов и свойств примыкающих соединений
   * @property d1
   * @type Number
   */
  get d1() {
    return this.sizeb;
  }

  /**
   * Расстояние от узла до внутреннего ребра элемента
   * зависит от ширины элементов и свойств примыкающих соединений
   * @property d2
   * @type Number
   */
  get d2() {
    return this.d1 - this.width;
  }

  /**
   * Возвращает тип элемента (соединитель)
   */
  get elm_type() {
    return $p.enm.elm_types.Соединитель;
  }

  /**
   * С этой функции начинается пересчет и перерисовка соединительного профиля
   * т.к. концы соединителя висят в пустоте и не связаны с другими профилями, возвращаем голый cnn_point
   *
   * @method cnn_point
   * @for ProfileConnective
   * @param node {String} - имя узла профиля: "b" или "e"
   * @return {CnnPoint} - объект {point, profile, cnn_types}
   */
  cnn_point(node) {
    return this.rays[node];
  }

  /**
   * Вычисляемые поля в таблице координат
   * @method save_coordinates
   * @for ProfileConnective
   */
  save_coordinates() {
    if(!this.data.generatrix)
      return;

    var _row = this._row,

      cnns = this.project.connections.cnns,
      b = this.rays.b,
      e = this.rays.e,

      row_b = cnns.add({
        elm1: _row.elm,
        node1: "b",
        cnn: b.cnn ? b.cnn.ref : "",
        aperture_len: this.corns(1).getDistance(this.corns(4))
      }),
      row_e = cnns.add({
        elm1: _row.elm,
        node1: "e",
        cnn: e.cnn ? e.cnn.ref : "",
        aperture_len: this.corns(2).getDistance(this.corns(3))
      }),

      gen = this.generatrix;

    _row.x1 = this.x1;
    _row.y1 = this.y1;
    _row.x2 = this.x2;
    _row.y2 = this.y2;
    _row.path_data = gen.pathData;
    _row.nom = this.nom;
    _row.parent = this.parent.elm;


    // добавляем припуски соединений
    _row.len = this.length;

    // сохраняем информацию о соединениях
    if(b.profile){
      row_b.elm2 = b.profile.elm;
      if(b.profile instanceof Filling)
        row_b.node2 = "t";
      else if(b.profile.e.is_nearest(b.point))
        row_b.node2 = "e";
      else if(b.profile.b.is_nearest(b.point))
        row_b.node2 = "b";
      else
        row_b.node2 = "t";
    }
    if(e.profile){
      row_e.elm2 = e.profile.elm;
      if(e.profile instanceof Filling)
        row_e.node2 = "t";
      else if(e.profile.b.is_nearest(e.point))
        row_e.node2 = "b";
      else if(e.profile.e.is_nearest(e.point))
        row_e.node2 = "b";
      else
        row_e.node2 = "t";
    }

    // получаем углы между элементами и к горизонту
    _row.angle_hor = this.angle_hor;

    _row.alp1 = Math.round((this.corns(4).subtract(this.corns(1)).angle - gen.getTangentAt(0).angle) * 10) / 10;
    if(_row.alp1 < 0)
      _row.alp1 = _row.alp1 + 360;

    _row.alp2 = Math.round((gen.getTangentAt(gen.length).angle - this.corns(2).subtract(this.corns(3)).angle) * 10) / 10;
    if(_row.alp2 < 0)
      _row.alp2 = _row.alp2 + 360;

    // устанавливаем тип элемента
    _row.elm_type = this.elm_type;

  }


}


/**
 * ### Служебный слой соединительных профилей
 * Унаследован от [paper.Layer](http://paperjs.org/reference/layer/)
 *
 * @class ConnectiveLayer
 * @extends paper.Layer
 * @constructor
 */
class ConnectiveLayer extends paper.Layer {

}
