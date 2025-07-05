module 0x5230e5671a286097e5738728171bcafa66af9c6f1a96540b0b42b089d4915157::aptos_swap {
    use std::signer;
    use std::event;
    
    #[event]
    struct SwapEvent has drop, store {
        eth_sender: address,
        aptos_receiver: address,
        amount: u64,
    }
    
    #[event]
    struct ReverseEvent has drop, store {
        aptos_sender: address,
        eth_receiver: address,
        amount: u64,
    }
    
    public fun receive_from_eth(account: &signer, eth_sender: address, amount: u64) {
        event::emit(SwapEvent {
            eth_sender,
            aptos_receiver: signer::address_of(account),
            amount,
        });
    }
    
    public fun swap_to_eth(account: &signer, eth_receiver: address, amount: u64) {
        event::emit(ReverseEvent {
            aptos_sender: signer::address_of(account),
            eth_receiver,
            amount,
        });
    }
}

// https://explorer.aptoslabs.com/txn/0xd8f267d0f1e10b06ab6ce64b490bd290de77755150ea430fbc3eeba7fdad11e1?network=devnet