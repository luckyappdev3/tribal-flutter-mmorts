// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'movements_event.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

/// @nodoc
mixin _$MovementsEvent {
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(String villageId) loadRequested,
    required TResult Function() refreshRequested,
    required TResult Function() tick,
    required TResult Function(Map<String, dynamic> data) attackResult,
    required TResult Function(Map<String, dynamic> data) attackIncoming,
    required TResult Function(Map<String, dynamic> data) troopsReturned,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(String villageId)? loadRequested,
    TResult? Function()? refreshRequested,
    TResult? Function()? tick,
    TResult? Function(Map<String, dynamic> data)? attackResult,
    TResult? Function(Map<String, dynamic> data)? attackIncoming,
    TResult? Function(Map<String, dynamic> data)? troopsReturned,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(String villageId)? loadRequested,
    TResult Function()? refreshRequested,
    TResult Function()? tick,
    TResult Function(Map<String, dynamic> data)? attackResult,
    TResult Function(Map<String, dynamic> data)? attackIncoming,
    TResult Function(Map<String, dynamic> data)? troopsReturned,
    required TResult orElse(),
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_LoadRequested value) loadRequested,
    required TResult Function(_RefreshRequested value) refreshRequested,
    required TResult Function(_Tick value) tick,
    required TResult Function(_AttackResult value) attackResult,
    required TResult Function(_AttackIncoming value) attackIncoming,
    required TResult Function(_TroopsReturned value) troopsReturned,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_LoadRequested value)? loadRequested,
    TResult? Function(_RefreshRequested value)? refreshRequested,
    TResult? Function(_Tick value)? tick,
    TResult? Function(_AttackResult value)? attackResult,
    TResult? Function(_AttackIncoming value)? attackIncoming,
    TResult? Function(_TroopsReturned value)? troopsReturned,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_LoadRequested value)? loadRequested,
    TResult Function(_RefreshRequested value)? refreshRequested,
    TResult Function(_Tick value)? tick,
    TResult Function(_AttackResult value)? attackResult,
    TResult Function(_AttackIncoming value)? attackIncoming,
    TResult Function(_TroopsReturned value)? troopsReturned,
    required TResult orElse(),
  }) =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $MovementsEventCopyWith<$Res> {
  factory $MovementsEventCopyWith(
          MovementsEvent value, $Res Function(MovementsEvent) then) =
      _$MovementsEventCopyWithImpl<$Res, MovementsEvent>;
}

/// @nodoc
class _$MovementsEventCopyWithImpl<$Res, $Val extends MovementsEvent>
    implements $MovementsEventCopyWith<$Res> {
  _$MovementsEventCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of MovementsEvent
  /// with the given fields replaced by the non-null parameter values.
}

/// @nodoc
abstract class _$$LoadRequestedImplCopyWith<$Res> {
  factory _$$LoadRequestedImplCopyWith(
          _$LoadRequestedImpl value, $Res Function(_$LoadRequestedImpl) then) =
      __$$LoadRequestedImplCopyWithImpl<$Res>;
  @useResult
  $Res call({String villageId});
}

/// @nodoc
class __$$LoadRequestedImplCopyWithImpl<$Res>
    extends _$MovementsEventCopyWithImpl<$Res, _$LoadRequestedImpl>
    implements _$$LoadRequestedImplCopyWith<$Res> {
  __$$LoadRequestedImplCopyWithImpl(
      _$LoadRequestedImpl _value, $Res Function(_$LoadRequestedImpl) _then)
      : super(_value, _then);

  /// Create a copy of MovementsEvent
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? villageId = null,
  }) {
    return _then(_$LoadRequestedImpl(
      null == villageId
          ? _value.villageId
          : villageId // ignore: cast_nullable_to_non_nullable
              as String,
    ));
  }
}

/// @nodoc

class _$LoadRequestedImpl implements _LoadRequested {
  const _$LoadRequestedImpl(this.villageId);

  @override
  final String villageId;

  @override
  String toString() {
    return 'MovementsEvent.loadRequested(villageId: $villageId)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$LoadRequestedImpl &&
            (identical(other.villageId, villageId) ||
                other.villageId == villageId));
  }

  @override
  int get hashCode => Object.hash(runtimeType, villageId);

  /// Create a copy of MovementsEvent
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$LoadRequestedImplCopyWith<_$LoadRequestedImpl> get copyWith =>
      __$$LoadRequestedImplCopyWithImpl<_$LoadRequestedImpl>(this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(String villageId) loadRequested,
    required TResult Function() refreshRequested,
    required TResult Function() tick,
    required TResult Function(Map<String, dynamic> data) attackResult,
    required TResult Function(Map<String, dynamic> data) attackIncoming,
    required TResult Function(Map<String, dynamic> data) troopsReturned,
  }) {
    return loadRequested(villageId);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(String villageId)? loadRequested,
    TResult? Function()? refreshRequested,
    TResult? Function()? tick,
    TResult? Function(Map<String, dynamic> data)? attackResult,
    TResult? Function(Map<String, dynamic> data)? attackIncoming,
    TResult? Function(Map<String, dynamic> data)? troopsReturned,
  }) {
    return loadRequested?.call(villageId);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(String villageId)? loadRequested,
    TResult Function()? refreshRequested,
    TResult Function()? tick,
    TResult Function(Map<String, dynamic> data)? attackResult,
    TResult Function(Map<String, dynamic> data)? attackIncoming,
    TResult Function(Map<String, dynamic> data)? troopsReturned,
    required TResult orElse(),
  }) {
    if (loadRequested != null) {
      return loadRequested(villageId);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_LoadRequested value) loadRequested,
    required TResult Function(_RefreshRequested value) refreshRequested,
    required TResult Function(_Tick value) tick,
    required TResult Function(_AttackResult value) attackResult,
    required TResult Function(_AttackIncoming value) attackIncoming,
    required TResult Function(_TroopsReturned value) troopsReturned,
  }) {
    return loadRequested(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_LoadRequested value)? loadRequested,
    TResult? Function(_RefreshRequested value)? refreshRequested,
    TResult? Function(_Tick value)? tick,
    TResult? Function(_AttackResult value)? attackResult,
    TResult? Function(_AttackIncoming value)? attackIncoming,
    TResult? Function(_TroopsReturned value)? troopsReturned,
  }) {
    return loadRequested?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_LoadRequested value)? loadRequested,
    TResult Function(_RefreshRequested value)? refreshRequested,
    TResult Function(_Tick value)? tick,
    TResult Function(_AttackResult value)? attackResult,
    TResult Function(_AttackIncoming value)? attackIncoming,
    TResult Function(_TroopsReturned value)? troopsReturned,
    required TResult orElse(),
  }) {
    if (loadRequested != null) {
      return loadRequested(this);
    }
    return orElse();
  }
}

abstract class _LoadRequested implements MovementsEvent {
  const factory _LoadRequested(final String villageId) = _$LoadRequestedImpl;

  String get villageId;

  /// Create a copy of MovementsEvent
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$LoadRequestedImplCopyWith<_$LoadRequestedImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class _$$RefreshRequestedImplCopyWith<$Res> {
  factory _$$RefreshRequestedImplCopyWith(_$RefreshRequestedImpl value,
          $Res Function(_$RefreshRequestedImpl) then) =
      __$$RefreshRequestedImplCopyWithImpl<$Res>;
}

/// @nodoc
class __$$RefreshRequestedImplCopyWithImpl<$Res>
    extends _$MovementsEventCopyWithImpl<$Res, _$RefreshRequestedImpl>
    implements _$$RefreshRequestedImplCopyWith<$Res> {
  __$$RefreshRequestedImplCopyWithImpl(_$RefreshRequestedImpl _value,
      $Res Function(_$RefreshRequestedImpl) _then)
      : super(_value, _then);

  /// Create a copy of MovementsEvent
  /// with the given fields replaced by the non-null parameter values.
}

/// @nodoc

class _$RefreshRequestedImpl implements _RefreshRequested {
  const _$RefreshRequestedImpl();

  @override
  String toString() {
    return 'MovementsEvent.refreshRequested()';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType && other is _$RefreshRequestedImpl);
  }

  @override
  int get hashCode => runtimeType.hashCode;

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(String villageId) loadRequested,
    required TResult Function() refreshRequested,
    required TResult Function() tick,
    required TResult Function(Map<String, dynamic> data) attackResult,
    required TResult Function(Map<String, dynamic> data) attackIncoming,
    required TResult Function(Map<String, dynamic> data) troopsReturned,
  }) {
    return refreshRequested();
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(String villageId)? loadRequested,
    TResult? Function()? refreshRequested,
    TResult? Function()? tick,
    TResult? Function(Map<String, dynamic> data)? attackResult,
    TResult? Function(Map<String, dynamic> data)? attackIncoming,
    TResult? Function(Map<String, dynamic> data)? troopsReturned,
  }) {
    return refreshRequested?.call();
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(String villageId)? loadRequested,
    TResult Function()? refreshRequested,
    TResult Function()? tick,
    TResult Function(Map<String, dynamic> data)? attackResult,
    TResult Function(Map<String, dynamic> data)? attackIncoming,
    TResult Function(Map<String, dynamic> data)? troopsReturned,
    required TResult orElse(),
  }) {
    if (refreshRequested != null) {
      return refreshRequested();
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_LoadRequested value) loadRequested,
    required TResult Function(_RefreshRequested value) refreshRequested,
    required TResult Function(_Tick value) tick,
    required TResult Function(_AttackResult value) attackResult,
    required TResult Function(_AttackIncoming value) attackIncoming,
    required TResult Function(_TroopsReturned value) troopsReturned,
  }) {
    return refreshRequested(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_LoadRequested value)? loadRequested,
    TResult? Function(_RefreshRequested value)? refreshRequested,
    TResult? Function(_Tick value)? tick,
    TResult? Function(_AttackResult value)? attackResult,
    TResult? Function(_AttackIncoming value)? attackIncoming,
    TResult? Function(_TroopsReturned value)? troopsReturned,
  }) {
    return refreshRequested?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_LoadRequested value)? loadRequested,
    TResult Function(_RefreshRequested value)? refreshRequested,
    TResult Function(_Tick value)? tick,
    TResult Function(_AttackResult value)? attackResult,
    TResult Function(_AttackIncoming value)? attackIncoming,
    TResult Function(_TroopsReturned value)? troopsReturned,
    required TResult orElse(),
  }) {
    if (refreshRequested != null) {
      return refreshRequested(this);
    }
    return orElse();
  }
}

abstract class _RefreshRequested implements MovementsEvent {
  const factory _RefreshRequested() = _$RefreshRequestedImpl;
}

/// @nodoc
abstract class _$$TickImplCopyWith<$Res> {
  factory _$$TickImplCopyWith(
          _$TickImpl value, $Res Function(_$TickImpl) then) =
      __$$TickImplCopyWithImpl<$Res>;
}

/// @nodoc
class __$$TickImplCopyWithImpl<$Res>
    extends _$MovementsEventCopyWithImpl<$Res, _$TickImpl>
    implements _$$TickImplCopyWith<$Res> {
  __$$TickImplCopyWithImpl(_$TickImpl _value, $Res Function(_$TickImpl) _then)
      : super(_value, _then);

  /// Create a copy of MovementsEvent
  /// with the given fields replaced by the non-null parameter values.
}

/// @nodoc

class _$TickImpl implements _Tick {
  const _$TickImpl();

  @override
  String toString() {
    return 'MovementsEvent.tick()';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType && other is _$TickImpl);
  }

  @override
  int get hashCode => runtimeType.hashCode;

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(String villageId) loadRequested,
    required TResult Function() refreshRequested,
    required TResult Function() tick,
    required TResult Function(Map<String, dynamic> data) attackResult,
    required TResult Function(Map<String, dynamic> data) attackIncoming,
    required TResult Function(Map<String, dynamic> data) troopsReturned,
  }) {
    return tick();
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(String villageId)? loadRequested,
    TResult? Function()? refreshRequested,
    TResult? Function()? tick,
    TResult? Function(Map<String, dynamic> data)? attackResult,
    TResult? Function(Map<String, dynamic> data)? attackIncoming,
    TResult? Function(Map<String, dynamic> data)? troopsReturned,
  }) {
    return tick?.call();
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(String villageId)? loadRequested,
    TResult Function()? refreshRequested,
    TResult Function()? tick,
    TResult Function(Map<String, dynamic> data)? attackResult,
    TResult Function(Map<String, dynamic> data)? attackIncoming,
    TResult Function(Map<String, dynamic> data)? troopsReturned,
    required TResult orElse(),
  }) {
    if (tick != null) {
      return tick();
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_LoadRequested value) loadRequested,
    required TResult Function(_RefreshRequested value) refreshRequested,
    required TResult Function(_Tick value) tick,
    required TResult Function(_AttackResult value) attackResult,
    required TResult Function(_AttackIncoming value) attackIncoming,
    required TResult Function(_TroopsReturned value) troopsReturned,
  }) {
    return tick(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_LoadRequested value)? loadRequested,
    TResult? Function(_RefreshRequested value)? refreshRequested,
    TResult? Function(_Tick value)? tick,
    TResult? Function(_AttackResult value)? attackResult,
    TResult? Function(_AttackIncoming value)? attackIncoming,
    TResult? Function(_TroopsReturned value)? troopsReturned,
  }) {
    return tick?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_LoadRequested value)? loadRequested,
    TResult Function(_RefreshRequested value)? refreshRequested,
    TResult Function(_Tick value)? tick,
    TResult Function(_AttackResult value)? attackResult,
    TResult Function(_AttackIncoming value)? attackIncoming,
    TResult Function(_TroopsReturned value)? troopsReturned,
    required TResult orElse(),
  }) {
    if (tick != null) {
      return tick(this);
    }
    return orElse();
  }
}

abstract class _Tick implements MovementsEvent {
  const factory _Tick() = _$TickImpl;
}

/// @nodoc
abstract class _$$AttackResultImplCopyWith<$Res> {
  factory _$$AttackResultImplCopyWith(
          _$AttackResultImpl value, $Res Function(_$AttackResultImpl) then) =
      __$$AttackResultImplCopyWithImpl<$Res>;
  @useResult
  $Res call({Map<String, dynamic> data});
}

/// @nodoc
class __$$AttackResultImplCopyWithImpl<$Res>
    extends _$MovementsEventCopyWithImpl<$Res, _$AttackResultImpl>
    implements _$$AttackResultImplCopyWith<$Res> {
  __$$AttackResultImplCopyWithImpl(
      _$AttackResultImpl _value, $Res Function(_$AttackResultImpl) _then)
      : super(_value, _then);

  /// Create a copy of MovementsEvent
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? data = null,
  }) {
    return _then(_$AttackResultImpl(
      null == data
          ? _value._data
          : data // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>,
    ));
  }
}

/// @nodoc

class _$AttackResultImpl implements _AttackResult {
  const _$AttackResultImpl(final Map<String, dynamic> data) : _data = data;

  final Map<String, dynamic> _data;
  @override
  Map<String, dynamic> get data {
    if (_data is EqualUnmodifiableMapView) return _data;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(_data);
  }

  @override
  String toString() {
    return 'MovementsEvent.attackResult(data: $data)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$AttackResultImpl &&
            const DeepCollectionEquality().equals(other._data, _data));
  }

  @override
  int get hashCode =>
      Object.hash(runtimeType, const DeepCollectionEquality().hash(_data));

  /// Create a copy of MovementsEvent
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$AttackResultImplCopyWith<_$AttackResultImpl> get copyWith =>
      __$$AttackResultImplCopyWithImpl<_$AttackResultImpl>(this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(String villageId) loadRequested,
    required TResult Function() refreshRequested,
    required TResult Function() tick,
    required TResult Function(Map<String, dynamic> data) attackResult,
    required TResult Function(Map<String, dynamic> data) attackIncoming,
    required TResult Function(Map<String, dynamic> data) troopsReturned,
  }) {
    return attackResult(data);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(String villageId)? loadRequested,
    TResult? Function()? refreshRequested,
    TResult? Function()? tick,
    TResult? Function(Map<String, dynamic> data)? attackResult,
    TResult? Function(Map<String, dynamic> data)? attackIncoming,
    TResult? Function(Map<String, dynamic> data)? troopsReturned,
  }) {
    return attackResult?.call(data);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(String villageId)? loadRequested,
    TResult Function()? refreshRequested,
    TResult Function()? tick,
    TResult Function(Map<String, dynamic> data)? attackResult,
    TResult Function(Map<String, dynamic> data)? attackIncoming,
    TResult Function(Map<String, dynamic> data)? troopsReturned,
    required TResult orElse(),
  }) {
    if (attackResult != null) {
      return attackResult(data);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_LoadRequested value) loadRequested,
    required TResult Function(_RefreshRequested value) refreshRequested,
    required TResult Function(_Tick value) tick,
    required TResult Function(_AttackResult value) attackResult,
    required TResult Function(_AttackIncoming value) attackIncoming,
    required TResult Function(_TroopsReturned value) troopsReturned,
  }) {
    return attackResult(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_LoadRequested value)? loadRequested,
    TResult? Function(_RefreshRequested value)? refreshRequested,
    TResult? Function(_Tick value)? tick,
    TResult? Function(_AttackResult value)? attackResult,
    TResult? Function(_AttackIncoming value)? attackIncoming,
    TResult? Function(_TroopsReturned value)? troopsReturned,
  }) {
    return attackResult?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_LoadRequested value)? loadRequested,
    TResult Function(_RefreshRequested value)? refreshRequested,
    TResult Function(_Tick value)? tick,
    TResult Function(_AttackResult value)? attackResult,
    TResult Function(_AttackIncoming value)? attackIncoming,
    TResult Function(_TroopsReturned value)? troopsReturned,
    required TResult orElse(),
  }) {
    if (attackResult != null) {
      return attackResult(this);
    }
    return orElse();
  }
}

abstract class _AttackResult implements MovementsEvent {
  const factory _AttackResult(final Map<String, dynamic> data) =
      _$AttackResultImpl;

  Map<String, dynamic> get data;

  /// Create a copy of MovementsEvent
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$AttackResultImplCopyWith<_$AttackResultImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class _$$AttackIncomingImplCopyWith<$Res> {
  factory _$$AttackIncomingImplCopyWith(_$AttackIncomingImpl value,
          $Res Function(_$AttackIncomingImpl) then) =
      __$$AttackIncomingImplCopyWithImpl<$Res>;
  @useResult
  $Res call({Map<String, dynamic> data});
}

/// @nodoc
class __$$AttackIncomingImplCopyWithImpl<$Res>
    extends _$MovementsEventCopyWithImpl<$Res, _$AttackIncomingImpl>
    implements _$$AttackIncomingImplCopyWith<$Res> {
  __$$AttackIncomingImplCopyWithImpl(
      _$AttackIncomingImpl _value, $Res Function(_$AttackIncomingImpl) _then)
      : super(_value, _then);

  /// Create a copy of MovementsEvent
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? data = null,
  }) {
    return _then(_$AttackIncomingImpl(
      null == data
          ? _value._data
          : data // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>,
    ));
  }
}

/// @nodoc

class _$AttackIncomingImpl implements _AttackIncoming {
  const _$AttackIncomingImpl(final Map<String, dynamic> data) : _data = data;

  final Map<String, dynamic> _data;
  @override
  Map<String, dynamic> get data {
    if (_data is EqualUnmodifiableMapView) return _data;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(_data);
  }

  @override
  String toString() {
    return 'MovementsEvent.attackIncoming(data: $data)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$AttackIncomingImpl &&
            const DeepCollectionEquality().equals(other._data, _data));
  }

  @override
  int get hashCode =>
      Object.hash(runtimeType, const DeepCollectionEquality().hash(_data));

  /// Create a copy of MovementsEvent
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$AttackIncomingImplCopyWith<_$AttackIncomingImpl> get copyWith =>
      __$$AttackIncomingImplCopyWithImpl<_$AttackIncomingImpl>(
          this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(String villageId) loadRequested,
    required TResult Function() refreshRequested,
    required TResult Function() tick,
    required TResult Function(Map<String, dynamic> data) attackResult,
    required TResult Function(Map<String, dynamic> data) attackIncoming,
    required TResult Function(Map<String, dynamic> data) troopsReturned,
  }) {
    return attackIncoming(data);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(String villageId)? loadRequested,
    TResult? Function()? refreshRequested,
    TResult? Function()? tick,
    TResult? Function(Map<String, dynamic> data)? attackResult,
    TResult? Function(Map<String, dynamic> data)? attackIncoming,
    TResult? Function(Map<String, dynamic> data)? troopsReturned,
  }) {
    return attackIncoming?.call(data);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(String villageId)? loadRequested,
    TResult Function()? refreshRequested,
    TResult Function()? tick,
    TResult Function(Map<String, dynamic> data)? attackResult,
    TResult Function(Map<String, dynamic> data)? attackIncoming,
    TResult Function(Map<String, dynamic> data)? troopsReturned,
    required TResult orElse(),
  }) {
    if (attackIncoming != null) {
      return attackIncoming(data);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_LoadRequested value) loadRequested,
    required TResult Function(_RefreshRequested value) refreshRequested,
    required TResult Function(_Tick value) tick,
    required TResult Function(_AttackResult value) attackResult,
    required TResult Function(_AttackIncoming value) attackIncoming,
    required TResult Function(_TroopsReturned value) troopsReturned,
  }) {
    return attackIncoming(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_LoadRequested value)? loadRequested,
    TResult? Function(_RefreshRequested value)? refreshRequested,
    TResult? Function(_Tick value)? tick,
    TResult? Function(_AttackResult value)? attackResult,
    TResult? Function(_AttackIncoming value)? attackIncoming,
    TResult? Function(_TroopsReturned value)? troopsReturned,
  }) {
    return attackIncoming?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_LoadRequested value)? loadRequested,
    TResult Function(_RefreshRequested value)? refreshRequested,
    TResult Function(_Tick value)? tick,
    TResult Function(_AttackResult value)? attackResult,
    TResult Function(_AttackIncoming value)? attackIncoming,
    TResult Function(_TroopsReturned value)? troopsReturned,
    required TResult orElse(),
  }) {
    if (attackIncoming != null) {
      return attackIncoming(this);
    }
    return orElse();
  }
}

abstract class _AttackIncoming implements MovementsEvent {
  const factory _AttackIncoming(final Map<String, dynamic> data) =
      _$AttackIncomingImpl;

  Map<String, dynamic> get data;

  /// Create a copy of MovementsEvent
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$AttackIncomingImplCopyWith<_$AttackIncomingImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class _$$TroopsReturnedImplCopyWith<$Res> {
  factory _$$TroopsReturnedImplCopyWith(_$TroopsReturnedImpl value,
          $Res Function(_$TroopsReturnedImpl) then) =
      __$$TroopsReturnedImplCopyWithImpl<$Res>;
  @useResult
  $Res call({Map<String, dynamic> data});
}

/// @nodoc
class __$$TroopsReturnedImplCopyWithImpl<$Res>
    extends _$MovementsEventCopyWithImpl<$Res, _$TroopsReturnedImpl>
    implements _$$TroopsReturnedImplCopyWith<$Res> {
  __$$TroopsReturnedImplCopyWithImpl(
      _$TroopsReturnedImpl _value, $Res Function(_$TroopsReturnedImpl) _then)
      : super(_value, _then);

  /// Create a copy of MovementsEvent
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? data = null,
  }) {
    return _then(_$TroopsReturnedImpl(
      null == data
          ? _value._data
          : data // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>,
    ));
  }
}

/// @nodoc

class _$TroopsReturnedImpl implements _TroopsReturned {
  const _$TroopsReturnedImpl(final Map<String, dynamic> data) : _data = data;

  final Map<String, dynamic> _data;
  @override
  Map<String, dynamic> get data {
    if (_data is EqualUnmodifiableMapView) return _data;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(_data);
  }

  @override
  String toString() {
    return 'MovementsEvent.troopsReturned(data: $data)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TroopsReturnedImpl &&
            const DeepCollectionEquality().equals(other._data, _data));
  }

  @override
  int get hashCode =>
      Object.hash(runtimeType, const DeepCollectionEquality().hash(_data));

  /// Create a copy of MovementsEvent
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$TroopsReturnedImplCopyWith<_$TroopsReturnedImpl> get copyWith =>
      __$$TroopsReturnedImplCopyWithImpl<_$TroopsReturnedImpl>(
          this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(String villageId) loadRequested,
    required TResult Function() refreshRequested,
    required TResult Function() tick,
    required TResult Function(Map<String, dynamic> data) attackResult,
    required TResult Function(Map<String, dynamic> data) attackIncoming,
    required TResult Function(Map<String, dynamic> data) troopsReturned,
  }) {
    return troopsReturned(data);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(String villageId)? loadRequested,
    TResult? Function()? refreshRequested,
    TResult? Function()? tick,
    TResult? Function(Map<String, dynamic> data)? attackResult,
    TResult? Function(Map<String, dynamic> data)? attackIncoming,
    TResult? Function(Map<String, dynamic> data)? troopsReturned,
  }) {
    return troopsReturned?.call(data);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(String villageId)? loadRequested,
    TResult Function()? refreshRequested,
    TResult Function()? tick,
    TResult Function(Map<String, dynamic> data)? attackResult,
    TResult Function(Map<String, dynamic> data)? attackIncoming,
    TResult Function(Map<String, dynamic> data)? troopsReturned,
    required TResult orElse(),
  }) {
    if (troopsReturned != null) {
      return troopsReturned(data);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_LoadRequested value) loadRequested,
    required TResult Function(_RefreshRequested value) refreshRequested,
    required TResult Function(_Tick value) tick,
    required TResult Function(_AttackResult value) attackResult,
    required TResult Function(_AttackIncoming value) attackIncoming,
    required TResult Function(_TroopsReturned value) troopsReturned,
  }) {
    return troopsReturned(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_LoadRequested value)? loadRequested,
    TResult? Function(_RefreshRequested value)? refreshRequested,
    TResult? Function(_Tick value)? tick,
    TResult? Function(_AttackResult value)? attackResult,
    TResult? Function(_AttackIncoming value)? attackIncoming,
    TResult? Function(_TroopsReturned value)? troopsReturned,
  }) {
    return troopsReturned?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_LoadRequested value)? loadRequested,
    TResult Function(_RefreshRequested value)? refreshRequested,
    TResult Function(_Tick value)? tick,
    TResult Function(_AttackResult value)? attackResult,
    TResult Function(_AttackIncoming value)? attackIncoming,
    TResult Function(_TroopsReturned value)? troopsReturned,
    required TResult orElse(),
  }) {
    if (troopsReturned != null) {
      return troopsReturned(this);
    }
    return orElse();
  }
}

abstract class _TroopsReturned implements MovementsEvent {
  const factory _TroopsReturned(final Map<String, dynamic> data) =
      _$TroopsReturnedImpl;

  Map<String, dynamic> get data;

  /// Create a copy of MovementsEvent
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$TroopsReturnedImplCopyWith<_$TroopsReturnedImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
