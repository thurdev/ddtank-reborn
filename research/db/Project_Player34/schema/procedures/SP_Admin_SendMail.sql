-- SQL_STORED_PROCEDURE dbo.SP_Admin_SendMail (modified 2021-06-04T05:18:34.647)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<后台赠送物品：GM后台使用带礼卷功能>
-- =============================================
CREATE  Procedure [dbo].[SP_Admin_SendMail]
 @Title Nvarchar(1000), 
 @Content Nvarchar(2000), 
 @UserID Int, 
 @Gold Int, 
 @Money Int, 
 @GiftToken Int,
 @Param Nvarchar(2000)
as 
/*第一步：定义变量*/
DECLARE @SenderID INT           --发送者id
DECLARE @Sender  NVARCHAR(50)   --发送者名称
DECLARE @ReceiverID INT         --收件人id
DECLARE @Titles NVARCHAR(500)    --标题
DECLARE @Contents NVARCHAR(2000)
DECLARE @SendTime datetime

/*

	[SendTime] [datetime] NOT NULL ,
	[IsRead] [bit] NOT NULL ,
	[IsDelR] [bit] NOT NULL ,
	[IfDelS] [bit] NOT NULL ,
	[IsDelete] [bit] NOT NULL ,
	[Annex1] [nvarchar] (50) COLLATE Chinese_PRC_CI_AS NULL ,
	[Annex2] [nvarchar] (50) COLLATE Chinese_PRC_CI_AS NULL ,
	[Gold] [int] NOT NULL ,
	[Money] [int] NOT NULL ,
	[IsExist] [bit] NOT NULL ,
	[Type] [int] NOT NULL ,
	[Remark] [nvarchar] (200) COLLATE Chinese_PRC_CI_AS NULL ,
	[ValidDate] [int] NOT NULL ,
	[Annex1Name] [nvarchar] (50) COLLATE Chinese_PRC_CI_AS NULL ,
	[Annex2Name] [nvarchar] (50) COLLATE Chinese_PRC_CI_AS NULL ,
	[SendDate] [datetime] NOT NULL ,
	[Annex3] [nvarchar] (50) COLLATE Chinese_PRC_CI_AS NULL ,
	[Annex4] [nvarchar] (50) COLLATE Chinese_PRC_CI_AS NULL ,
	[Annex5] [nvarchar] (50) COLLATE Chinese_PRC_CI_AS NULL ,
	[Annex3Name] [nvarchar] (50) COLLATE Chinese_PRC_CI_AS NULL ,
	[Annex4Name] [nvarchar] (50) COLLATE Chinese_PRC_CI_AS NULL ,
	[Annex5Name] [nvarchar] (50) COLLATE Chinese_PRC_CI_AS NULL ,
	[AnnexRemark] [nvarchar] (200) COLLATE Chinese_PRC_CI_AS NULL ,
	[GiftToken] [int] NOT NULL 
*/


GO
