import React from 'react';
import {Elements, injectStripe, CardElement, StripeProvider} from 'react-stripe-elements';
import Fetcher from "../../utilities/fetcher.jsx"
import {get, has} from "lodash";
import ServiceBotBaseForm from "./servicebot-base-form.jsx";
import {inputField} from "./servicebot-base-field.jsx";
import {required} from 'redux-form-validators'
import {Field,} from 'redux-form'
import Collapsible from 'react-collapsible';
import Buttons from "../buttons.jsx";

class CardSection extends React.Component {
    render() {
        return (
            <div className="form-group" id="card-element">
                <CardElement style={{
                    base: {
                        color: '#32325d',
                        lineHeight: '24px',
                        fontFamily: 'Helvetica Neue',
                        fontSmoothing: 'antialiased',
                        fontSize: '16px',
                        '::placeholder': {
                            color: '#aab7c4'
                        }
                    },
                    invalid: {
                        color: '#fa755a',
                        iconColor: '#fa755a'
                    }
                }}/>
            </div>
        );
    }
}

class BillingForm extends React.Component {
    render() {
        return (
            <StripeProvider apiKey={this.props.spk || "no_public_token"}>
                <Elements id="payment-form">
                    <CreditCardForm {...this.props}/>
                </Elements>
            </StripeProvider>

        )
    }
}

function BillingInfo(props) {
    return (
        <form>
            <CardSection/>
            <Field name="name" type="text" component={inputField} placeholder="Name on the card"/>
            <Field name="address_line1" type="text" component={inputField} placeholder="Address"/>
            <Field name="address_city" type="text" component={inputField} placeholder="City"/>
            <Field name="address_state" type="text" component={inputField} placeholder="State"/>
            {/*<button type="submit">Submit</button>*/}
            <div className="text-right">
                <Buttons btnType="primary" text="Save Card" onClick={props.handleSubmit} type="submit" value="submit"/>
            </div>
        </form>
    )
}

class CreditCardForm extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasCard: false,
            loading: true,
            card: {}
        };
        this.submissionPrep = this.submissionPrep.bind(this);

        this.checkIfUserHasCard = this.checkIfUserHasCard.bind(this);
    }

    componentDidMount() {
        if (this.props.uid) {
            this.checkIfUserHasCard();
        } else {
            this.setState({loading: false, hasCard: false});
        }

    }

    async submissionPrep(values) {
        let token = await this.props.stripe.createToken({...values});
        console.log(token);
        if (token.error) {
            throw token.error.message
        }
        return {user_id: this.props.uid, token_id: token.token.id};
    }

    checkIfUserHasCard() {
        let self = this;
        Fetcher(`/api/v1/users/${self.props.uid}`).then(function (response) {
            if (!response.error) {
                if (has(response, 'references.funds[0]') && has(response, 'references.funds[0].source.card')) {
                    let fund = get(response, 'references.funds[0]');
                    let card = get(response, 'references.funds[0].source.card');
                    self.setState({
                        loading: false,
                        displayName: response.name || response.email || "You",
                        hasCard: true,
                        fund: fund,
                        card: card,
                        personalInformation: {
                            name: card.name,
                            address_line1: card.address_line1,
                            address_city: card.address_city,
                            address_state: card.address_state,
                        }
                    }, function () {
                    });
                }
            } else {
                self.setState({loading: false, hasCard: false});
            }
        });
    }

    render() {
        let submissionRequest = {
            'method': 'POST',
            'url': `/api/v1/funds`
        };

        if(this.props.submitAPI) {
            submissionRequest.url = this.props.submitAPI;
        }



        let {hasCard, displayName, card: {brand, last4, exp_month, exp_year}} = this.state;

        let getBrandIcon = ()=>{
            if(brand === 'American Express'){
                return 'fa fa-cc-amex';
            }else{
                return `fa fa-cc-${brand.replace(/\s+/g, '-').toLowerCase()}`;
            }
        };

        let getCard = ()=>{
            if(hasCard) {
                return (
                    <div className="card-accordion">
                        <p>
                            <i className={getBrandIcon()}/>
                            {brand} ending in <span className="last4">{last4}</span>
                            <span className="exp_month">{exp_month}</span> /
                            <span className="exp_year">{exp_year}</span>
                        </p>
                    </div>
                )
            }else{
                return (
                    <div className="card-accordion">
                        <p>
                            <i className="fa fa-plus"/>
                            <span>Add your card</span>
                        </p>
                    </div>
                )
            }
        };

        return (
            <div id="payment-form">
                <h3><i className="fa fa-credit-card"/>Your credit and debit card</h3>
                <hr/>
                <div className="form-row">
                    {hasCard && <p>You can update your payment method by clicking on your existing credit card.</p>}
                    <Collapsible trigger={getCard()} open={!hasCard}>
                        <div className="service-instance-box-content">
                        <ServiceBotBaseForm
                            form={BillingInfo}
                            initialValues={{...this.state.personalInformation}}
                            submissionPrep={this.submissionPrep}
                            submissionRequest={submissionRequest}
                            successMessage={"Fund added successfully"}
                            handleResponse={this.props.handleResponse}
                        />
                        </div>
                    </Collapsible>
                </div>
            </div>
        );
    }
}

CreditCardForm = injectStripe(CreditCardForm);

export {CreditCardForm, BillingForm, CardSection};
