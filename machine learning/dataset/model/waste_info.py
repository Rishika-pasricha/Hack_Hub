WASTE_INFO = {
    "biodegradable": {
        "treatment": "Compost in green bin",
        "decomposition": "Decomposes naturally in 2-6 weeks",
        "tips": "Use compost pit or municipal wet waste collection"
    },
    "non_biodegradable": {
        "treatment": "Recycle in blue bin",
        "decomposition": "Takes hundreds of years",
        "tips": "Send to recycling center or kabadiwala"
    }
}

def get_waste_info(category):
    return WASTE_INFO.get(category, {
        "treatment": "Unknown",
        "decomposition": "Unknown",
        "tips": "Try clearer image"
    })