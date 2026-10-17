-- SQL_STORED_PROCEDURE dbo.SP_MissionEnergyInfo_All (modified 2015-01-25T14:04:48.670)
-- =============================================
-- Author:		<Peter>
-- ALTER  date: <2009-11-27>
-- Description:	<Mission Info>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_MissionEnergyInfo_All]
AS  
    SELECT * FROM MissionEnergyPrice

GO
