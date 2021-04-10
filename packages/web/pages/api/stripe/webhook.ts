import { MembershipSubscriptionPeriod } from '@journaly/j-db-client'
import stripe from '../../../nexus/utils/stripe'
import { getClient } from '../../../nexus/utils'

const handler = async (req: any, res: any) => {
  const db = getClient()
  const event = req.body

  const updateStripeSubscription = async (subscriptionId: string) => {
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId)
    let expiresAt = stripeSubscription.current_period_end * 1000

    // Apply a grace period of 2 days to 'active' subscriptions
    if (stripeSubscription.status === 'active') {
      expiresAt += 24 * 60 * 60 * 1000 * 2
    }
    
    await db.membershipSubscription.update({
      where: {
        stripeSubscriptionId: subscriptionId,
      },
      data: {
        expiresAt: new Date(expiresAt)
      },
    })
  }
    try {
      if (event.type === 'invoice.paid') {
        const stripeInvoice = event.data.object
        const subscriptionLine = stripeInvoice.lines.data.find((item: any) => item.type === 'subscription')
        console.log('stripeINVOICE', stripeInvoice)
        console.log('LINES', stripeInvoice.lines.data)

        if (!subscriptionLine) {
          throw new Error("Subscription line missing")
        }

        const userQuery = await db.user.findMany({
          where: {
            stripeCustomerId: stripeInvoice.customer,
          },
          include: {
            membershipSubscription: true,
          }
        })

        if (userQuery.length !== 1) throw new Error("Problem with user query")
        const currentUser = userQuery[0]

        const convertStripePriceToMembershipPeriod = (priceId: string) => {
          switch(priceId) {
            case 'price_1ISRgvB8OEjVdGPaQr7ZANW8':
              return MembershipSubscriptionPeriod.MONTHLY
            case 'price_1ISRgvB8OEjVdGPaeOx4m255':
              return MembershipSubscriptionPeriod.QUARTERLY
            case 'price_1ISRgvB8OEjVdGPam1PTr6hE':
              return MembershipSubscriptionPeriod.ANNUALY
          }
          return null
        }

        const membershipPeriod = convertStripePriceToMembershipPeriod(subscriptionLine.price.id)
        if (!membershipPeriod) throw new Error("Unable to resolve a period from invoice object")

        const invoice = await db.membershipSubscriptionInvoice.create({
          data: {
            stripeInvoiceId: stripeInvoice.id,
            stripeInvoiceData: stripeInvoice,
            membershipSubscriptionPeriod: membershipPeriod,
            user: {
              connect: {
                id: currentUser.id,
              },
            },
          }
        })

        for (const item of stripeInvoice.lines.data) {
          await db.membershipSubscriptionInvoiceItem.create({
            data: {
              amount: item.amount,
              currency: item.currency,
              description: item.description,
              proration: item.proration,
              invoice: {
                connect: {
                  id: invoice.id,
                },
              },
              stripeInvoiceItemId: item.stripeInvoiceItemId,
              stripeInvoiceItemData: item,
            },
          })
        }

        await updateStripeSubscription(subscriptionLine.subscription)
      } else if (event.type === 'invoice.payment_failed') {
        /**
         * For now we'll just do nothing and allow the subscription to expire
         */
        const invoice = event.data.object
        const subscriptionLine = invoice.lines.data[0]

        if (!subscriptionLine) {
          throw new Error("Subscription line missing")
        }
        if (subscriptionLine.type !== 'subscription') {
          throw new Error("First line item is not a subscription. Something seems wrong here...")
        }

        await updateStripeSubscription(subscriptionLine.subscription)
      }
      // handle creating a new membershipSubscriptionTransaction when upgrading/downgrading
    } catch (err) {
      // TODO: get better logging
      console.log(err)
    }

  res.status(200).json({
    received: true,
  })
}

export default handler
