// Load in our dependencies
var expect = require('chai').expect;
var BaseComponent = require('../../browser/js/base-component');

// Start our tests
describe('A BaseComponent with a generic state change', function () {
  it('emits previous and new state', function () {
    // Create our component with an initial state
    var component = new BaseComponent({});
    component.setState({foo: 'foo'});

    // Set up hook for saving previous/new state
    var prevState, newState;
    component.onStateChange(function handleStateChange (_prevState, _newState) {
      prevState = _prevState;
      newState = _newState;
    });

    // Alter state and assert changes
    component.setState({foo: 'bar'});
    expect(prevState).to.deep.equal({foo: 'foo'});
    expect(newState).to.deep.equal({foo: 'bar'});
  });

  it('doesn\'t persist previous state on multiple changes', function () {
    // Create our component with an initial state
    var component = new BaseComponent({});
    component.setState({foo: 'foo'});

    // Set up hook for saving previous/new state
    var prevState, newState;
    component.onStateChange(function handleStateChange (_prevState, _newState) {
      prevState = _prevState;
      newState = _newState;
    });

    // Alter state multiple times
    component.setState({foo: 'bar'});
    component.setState({foo: 'baz'});
    expect(prevState).to.deep.equal({foo: 'bar'});
    expect(newState).to.deep.equal({foo: 'baz'});
  });
});

describe('A BaseComponent with a property state change', function () {
  it('emits previous and new property changes', function () {
    // Create our component with an initial state
    var component = new BaseComponent({});
    component.setState({foo: 'foo'});

    // Set up hook for saving previous/new state
    var prevProperty, newProperty;
    component.onStateChange('foo', function handlePropertyStateChange (_prevProperty, _newProperty) {
      prevProperty = _prevProperty;
      newProperty = _newProperty;
    });

    // Alter state and assert changes
    component.setState({foo: 'bar'});
    expect(prevProperty).to.deep.equal('foo');
    expect(newProperty).to.deep.equal('bar');
  });

  it('doesn\'t persist previous state on multiple changes', function () {
    // Create our component with an initial state
    var component = new BaseComponent({});
    component.setState({foo: 'foo'});

    // Set up hook for saving previous/new property state
    var prevProperty, newProperty;
    component.onStateChange('foo', function handlePropertyStateChange (_prevProperty, _newProperty) {
      prevProperty = _prevProperty;
      newProperty = _newProperty;
    });

    // Alter state multiple times
    component.setState({foo: 'bar'});
    component.setState({foo: 'baz'});
    expect(prevProperty).to.deep.equal('bar');
    expect(newProperty).to.deep.equal('baz');
  });
});
