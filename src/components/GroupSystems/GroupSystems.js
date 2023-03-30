import { Button } from '@patternfly/react-core';
import { fitContent, TableVariant } from '@patternfly/react-table';
import difference from 'lodash/difference';
import map from 'lodash/map';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { clearFilters, selectEntity } from '../../store/inventory-actions';
import AddSystemsToGroupModal from '../InventoryGroups/Modals/AddSystemsToGroupModal';
import InventoryTable from '../InventoryTable/InventoryTable';

export const bulkSelectConfig = (dispatch, selectedNumber, noneSelected, pageSelected, rowsNumber) => ({
    count: selectedNumber,
    id: 'bulk-select-groups',
    items: [
        {
            title: 'Select none (0)',
            onClick: () => dispatch(selectEntity(-1, false)),
            props: { isDisabled: noneSelected }
        },
        {
            title: `${pageSelected ? 'Deselect' : 'Select'} page (${
                rowsNumber
            } items)`,
            onClick: () => dispatch(selectEntity(0, !pageSelected))
        }
        // TODO: Implement "select all"
    ],
    onSelect: (value) => {
        dispatch(selectEntity(0, value));
    },
    checked: selectedNumber > 0 // TODO: support partial selection (dash sign) in FEC BulkSelect
});

const prepareColumns = (initialColumns) => {
    // hides the "groups" column
    const columns = initialColumns.filter(({ key }) => key !== 'groups');

    // additionally insert the "update method" column
    columns.splice(columns.length - 1 /* must be penultimate */, 0, {
        key: 'update_method',
        title: 'Update method',
        sortKey: 'update_method',
        transforms: [fitContent],
        renderFunc: (value, hostId, systemData) =>
            systemData?.system_profile?.system_update_method || 'N/A',
        props: {
            // TODO: remove isStatic when the sorting is supported by API
            isStatic: true,
            width: 10
        }
    });

    return columns;
};

const GroupSystems = ({ groupName, groupId }) => {
    const dispatch = useDispatch();

    const selected = useSelector(
        (state) => state?.entities?.selected || new Map()
    );
    const rows = useSelector(({ entities }) => entities?.rows || []);

    const noneSelected = selected.size === 0;
    const displayedIds = map(rows, 'id');
    const pageSelected =
    difference(displayedIds, [...selected.keys()]).length === 0;

    const [isModalOpen, setIsModalOpen] = useState(false);

    const resetTable = () => {
        dispatch(clearFilters());
        dispatch(selectEntity(-1, false));
    };

    useEffect(() => {
        return () => {
            resetTable();
        };
    }, []);

    return (
        <div id='group-systems-table'>
            {
                isModalOpen && <AddSystemsToGroupModal
                    isModalOpen={isModalOpen}
                    setIsModalOpen={(value) => {
                        resetTable();
                        setIsModalOpen(value);
                    }
                    }
                    groupId={groupId}
                    groupName={groupName}
                />
            }
            {
                !isModalOpen &&
                <InventoryTable
                    columns={prepareColumns}
                    getEntities={async (items, config, showTags, defaultGetEntities) =>
                        await defaultGetEntities(
                            items,
                            // filter systems by the group name
                            {
                                ...config,
                                filters: {
                                    ...config.filters,
                                    groupName: [groupName] // TODO: the param is not yet supported by `apiHostGetHostList`
                                }
                            },
                            showTags
                        )
                    }
                    tableProps={{
                        isStickyHeader: true,
                        variant: TableVariant.compact,
                        canSelectAll: false
                    }}
                    bulkSelect={bulkSelectConfig(dispatch, selected.size, noneSelected, pageSelected, rows.length)}
                >
                    <Button
                        variant='primary'
                        onClick={() => {
                            resetTable();
                            setIsModalOpen(true);
                        }}

                    >
                    Add systems
                    </Button>
                </InventoryTable>
            }
        </div>
    );
};

GroupSystems.propTypes = {
    groupName: PropTypes.string.isRequired,
    groupId: PropTypes.string.isRequired
};

export default GroupSystems;
