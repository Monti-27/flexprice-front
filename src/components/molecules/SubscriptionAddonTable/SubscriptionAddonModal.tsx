import { AddAddonToSubscriptionRequest } from '@/types/dto/Addon';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/atoms';
import Dialog from '@/components/atoms/Dialog';
import { useQuery } from '@tanstack/react-query';
import AddonApi from '@/api/AddonApi';
import { Select } from '@/components/atoms';
import { toSentenceCase } from '@/utils/common/helper_functions';
import { ADDON_TYPE } from '@/models/Addon';
interface Props {
	data?: AddAddonToSubscriptionRequest;
	currentAddons: AddAddonToSubscriptionRequest[];
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (addon: AddAddonToSubscriptionRequest) => void;
	onCancel: () => void;
	getEmptyAddon: () => Partial<AddAddonToSubscriptionRequest>;
}

interface FormErrors {
	addon_id?: string;
	end_date?: string;
}

const SubscriptionAddonModal: React.FC<Props> = ({ data, currentAddons, isOpen, onOpenChange, onSave, onCancel, getEmptyAddon }) => {
	const [formData, setFormData] = useState<Partial<AddAddonToSubscriptionRequest>>({});
	const [errors, setErrors] = useState<FormErrors>({});
	const [_, setSelectedAddonDetails] = useState<any>(null);

	// Fetch available addons - include all addons even if they have no charges
	const { data: addons = [] } = useQuery({
		queryKey: ['addons'],
		queryFn: async () => {
			const response = await AddonApi.ListAddon({ limit: 1000, offset: 0 });
			// Return all addons, including those without prices/charges
			return response.items;
		},
	});

	// Reset form when modal opens/closes
	useEffect(() => {
		if (isOpen) {
			if (data) {
				setFormData(data);
				// Find addon details for editing
				const addonDetails = addons.find((addon) => addon.id === data.addon_id);
				setSelectedAddonDetails(addonDetails);
			} else {
				setFormData(getEmptyAddon());
				setSelectedAddonDetails(null);
			}
			setErrors({});
		}
	}, [isOpen, data, getEmptyAddon, addons]);

	const validateForm = useCallback((): { isValid: boolean; errors: FormErrors } => {
		const newErrors: FormErrors = {};

		if (!formData.addon_id) {
			newErrors.addon_id = 'Addon is required';
		}

		if (formData.start_date && formData.end_date) {
			const startDate = new Date(formData.start_date);
			const endDate = new Date(formData.end_date);
			if (startDate >= endDate) {
				newErrors.end_date = 'End date must be after start date';
			}
		}

		return {
			isValid: Object.keys(newErrors).length === 0,
			errors: newErrors,
		};
	}, [formData]);

	const handleSave = useCallback(() => {
		const validation = validateForm();

		if (!validation.isValid) {
			setErrors(validation.errors);
			return;
		}

		setErrors({});
		const addonData: AddAddonToSubscriptionRequest = {
			addon_id: formData.addon_id!,
			start_date: formData.start_date,
			end_date: formData.end_date,
			metadata: formData.metadata || {},
		};

		onSave(addonData);
		setFormData(getEmptyAddon());
		setSelectedAddonDetails(null);
		onOpenChange(false);
	}, [formData, validateForm, onSave, getEmptyAddon, onOpenChange]);

	const handleCancel = useCallback(() => {
		setFormData({});
		setErrors({});
		setSelectedAddonDetails(null);
		onCancel();
	}, [onCancel]);

	const handleAddonSelect = useCallback(
		(addonId: string) => {
			const addonDetails = addons.find((addon) => addon.id === addonId);
			setSelectedAddonDetails(addonDetails);
			setFormData((prev) => ({ ...prev, addon_id: addonId }));
			// Clear error for this field when user selects
			if (errors.addon_id) {
				setErrors((prev) => ({ ...prev, addon_id: undefined }));
			}
		},
		[addons, errors.addon_id],
	);

	// const handleDateChange = useCallback(
	// 	(field: 'start_date' | 'end_date', date: Date | undefined) => {
	// 		setFormData((prev) => ({ ...prev, [field]: date?.toISOString() }));
	// 		// Clear error for end_date when user changes dates
	// 		if (field === 'end_date' && errors.end_date) {
	// 			setErrors((prev) => ({ ...prev, end_date: undefined }));
	// 		}
	// 	},
	// 	[errors.end_date],
	// );

	// Filter addon options based on current addons and addon type
	const filteredAddonOptions = useMemo(() => {
		return addons
			.filter((addon) => {
				// If editing, always include the current addon
				if (data && data.addon_id === addon.id) {
					return true;
				}

				// For one-time addons, check if they're already linked
				if (addon.type === ADDON_TYPE.ONETIME) {
					const isAlreadyLinked = currentAddons.some((currentAddon) => currentAddon.addon_id === addon.id);
					return !isAlreadyLinked;
				}

				// For multiple addons, always include them (can be added multiple times)
				return true;
			})
			.map((addon) => ({
				label: addon.name,
				value: addon.id,
				description: `${toSentenceCase(addon.type)} - ${addon.description || 'No description'}`,
			}));
	}, [addons, currentAddons, data]);

	return (
		<Dialog
			isOpen={isOpen}
			showCloseButton={false}
			onOpenChange={onOpenChange}
			title={data ? 'Edit Addon' : 'Add Addon'}
			className='sm:max-w-[600px]'>
			<div className='grid gap-4 mt-3'>
				<div className='space-y-2'>
					<Select
						label='Addon'
						placeholder='Select addon'
						options={filteredAddonOptions}
						value={formData.addon_id || ''}
						onChange={handleAddonSelect}
						error={errors.addon_id}
					/>
				</div>

				{/* TODO: Add start and end date */}
				{/* Start and End Date on same line */}
				{/* <div className='grid grid-cols-2 gap-4'>
					<div className='space-y-2'>
						<DatePicker
							label='Start Date'
							placeholder='Select start date'
							date={formData.start_date ? new Date(formData.start_date) : undefined}
							setDate={(date) => handleDateChange('start_date', date)}
						/>
					</div>
					<div className='space-y-2'>
						<DatePicker
							label='End Date'
							placeholder='Select end date'
							date={formData.end_date ? new Date(formData.end_date) : undefined}
							setDate={(date) => handleDateChange('end_date', date)}
						/>
						{errors.end_date && <p className='text-sm text-red-500'>{errors.end_date}</p>}
					</div>
				</div> */}
			</div>

			<div className='flex justify-end gap-2 mt-6'>
				<Button variant='outline' onClick={handleCancel}>
					Cancel
				</Button>
				<Button onClick={handleSave}>{data ? 'Save Changes' : 'Add Addon'}</Button>
			</div>
		</Dialog>
	);
};

export default SubscriptionAddonModal;
