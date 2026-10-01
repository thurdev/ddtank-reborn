-- SQL_STORED_PROCEDURE dbo.SP_Auction_Scan (modified 2021-08-28T09:48:58.627)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<拍卖行：拍卖到期返回物品到相应玩家>
-- =============================================
CREATE   PROCEDURE [dbo].[SP_Auction_Scan]
 @NoticeUserID nvarchar(4000) output,
 @Cess float

AS  
set @NoticeUserID=''
declare @AuctionID int
declare @AuctioneerID int
declare @AuctioneerName nvarchar(100)
declare @BuyerID int
declare @BuyerName nvarchar(100)
declare @ItemID int
declare @PayType int
declare @Price int
declare @Name nvarchar(200)


--信箱
declare @SenderID int
declare @Sender nvarchar(100)
declare @ReceiverID int
declare @Receiver nvarchar(100)
declare @Title nvarchar(1000)
declare @Content nvarchar(4000)
declare @SendTime DateTime
declare @IsRead bit
declare @IsDelR bit
declare @IfDelS bit
declare @IsDelete bit
declare @Annex1 nvarchar(100)
declare @Annex2 nvarchar(100)
declare @Gold int
declare @Money int
declare @Remark nvarchar(200)
declare @Type int


set @SenderID =0
set @Sender = dbo.GetTranslation('SP_Auction_Scan.Sender')--'弹弹堂拍卖中心' 
set @ReceiverID = 0
set @Receiver = ''
set @Title = dbo.GetTranslation('SP_Auction_Scan.Title')--'拍卖成功!'
set @Content = dbo.GetTranslation('SP_Auction_Scan.Content')--'拍卖成功!'
set @SendTime  = getdate()
set @IsRead  = 0
set @IsDelR = 0
set @IfDelS = 0
set @IsDelete =0
set @Annex1 =''
set @Annex2 =''
set @Gold =0
set @Money =0
declare @flat decimal(18,2)   --定义扣税
declare @NewPrice int	      --扣税后的价格

Set @flat=0.00                --设置扣税
--Select @flat=IsNull(Value,0.00) From Server_Config Where Name='Cess'
if object_id('tempdb..#Auction') is not null
drop table #Auction 

create table #Auction 
( 
id int identity(1,1), 
AuctionID int not null,
AuctioneerID int not null,
AuctioneerName nvarchar(200) not null,
BuyerID int not null,
BuyerName nvarchar(200) not null,
ItemID int not null,
Price int not null,
PayType int not null,
[Name] nvarchar(200)
) 

insert into #Auction select AuctionID,AuctioneerID,AuctioneerName,BuyerID,BuyerName,ItemID,Price,PayType,[Name] from Auction with(nolock) where IsExist=1 and datediff(hh,BeginDate,getdate())>ValidDate

declare @Index int
declare @ItemCount int
set @Index = 1
select @ItemCount=count(*) from  #Auction

set xact_abort on 

while @Index<=@ItemCount
begin
   select @AuctionID=AuctionID,@AuctioneerID=AuctioneerID,@AuctioneerName=AuctioneerName,@BuyerID=BuyerID,@BuyerName=BuyerName,@ItemID=ItemID,@Price=Price,@PayType=PayType,@Name=[Name]
   from #Auction where [id]=@Index

  set @Index = @Index+1
  begin tran
  update Auction set IsExist=0 where AuctionID=@AuctionID 
 
  if @@error<>0 or @@ROWCOUNT =0
    begin
      rollback tran
      CONTINUE 
   end

    if @BuyerID=0 
      begin
        set @BuyerID=@AuctioneerID
        set @BuyerName=@AuctioneerName
        set @Title= dbo.GetTranslation('SP_Auction_Scan.Msg1')+@Name+'!!'--'拍卖过期:    '+@Name+'!!'
        set @Content= dbo.GetTranslation('SP_Auction_Scan.Msg2')--'您所拍卖的  '+@Name+'  超过保管时间!!'
        set @Content = REPLACE(@Content,'{0}',@Name)
        set @Type=3
      end
    else
     begin

        set @Title= dbo.GetTranslation('SP_Auction_Scan.Msg3')+@Name+'!!'--'竞标成功:    '+@Name+'!!'
        set @Content= dbo.GetTranslation('SP_Auction_Scan.Msg4')----'您成功竞标<'+@AuctioneerName+'>拍卖的  '+@Name+'  ，支付'+cast(@Price as varchar(20))+'点卷!'
        set @Content = REPLACE(@Content,'{0}',@AuctioneerName)
        set @Content = REPLACE(@Content,'{1}',@Name)
        set @Content = REPLACE(@Content,'{2}',cast(@Price as varchar(20)))
        set @Type=4
     end
     set @Remark = 'Gold:0,Money:0,Annex1:'+cast(@ItemID as varchar(20))+',Annex2:'+@Annex2

        INSERT INTO User_Messages( SenderID, Sender, ReceiverID, Receiver, Title, Content, SendTime, IsRead, IsDelR, IfDelS, IsDelete, Annex1, Annex2, Gold, [Money], IsExist,Type,Remark) 
     VALUES( @SenderID, @Sender, @BuyerID, @BuyerName, @Title, @Content, @SendTime, @IsRead, @IsDelR, @IfDelS, @IsDelete, @ItemID, @Annex2, 0, 0, 1,@Type,@Remark)

     if @@error<>0  
       begin
        rollback tran
        CONTINUE 
       end

     set @NoticeUserID = @NoticeUserID + cast(@BuyerID as nvarchar(50)) + ','
   
   if @AuctioneerID<>@BuyerID
    begin

      if @PayType = 0
       begin
         set @Money = 0
         set @Gold = @Price
       end
      else
       begin
         set @Money = @Price 
         set @Gold = 0
       end   
        set @NewPrice=@Money-round(@flat*@Money,0)
        set @Title= dbo.GetTranslation('SP_Auction_Scan.Msg5')+@Name+'!!'--'拍卖成功:    '+@Name+'!!'
        If @flat>0 
           Begin
            set @Content= dbo.GetTranslation('SP_Auction_Scan.Msg6')--'您所拍卖的  '+@Name+'  被<'+@BuyerName+'>购买，一共获得'+cast(@Price as varchar(20))+'点券!!'
            set @Content = REPLACE(@Content,'{3}',cast(@Money-@NewPrice as varchar(20)))
           End
        Else
           Begin
            set @Content= dbo.GetTranslation('SP_Auction_Scan.Msg7')--'您所拍卖的  '+@Name+'  被<'+@BuyerName+'>购买，一共获得'+cast(@Price as varchar(20))+'点券!!'
           End
        set @Content = REPLACE(@Content,'{0}',@Name)
        set @Content = REPLACE(@Content,'{1}',@BuyerName)
        set @Content = REPLACE(@Content,'{2}',cast(@Money as varchar(20)))
        set @Content = REPLACE(@Content,'{4}',cast(@NewPrice as varchar(20)))
        set @Remark = 'Gold:'+cast(@Gold as varchar(20))+',Money:'+cast(@NewPrice as varchar(20))+',Annex1:'+@Annex1+',Annex2:'+@Annex2
        set @Type=2

        INSERT INTO User_Messages( SenderID, Sender, ReceiverID, Receiver, Title, Content, SendTime, IsRead, IsDelR, IfDelS, IsDelete, Annex1, Annex2, Gold, [Money], IsExist,Type,Remark) 
     VALUES( @SenderID, @Sender, @AuctioneerID, @AuctioneerName, @Title, @Content, @SendTime, @IsRead, @IsDelR, @IfDelS, @IsDelete, @Annex1, @Annex2, @Gold, @NewPrice, 1,@Type,@Remark)
     
     if @@error<>0  
       begin
        rollback tran
        CONTINUE 
       end

     set @NoticeUserID = @NoticeUserID +  cast(@AuctioneerID as nvarchar(50)) + ','

    end

  commit tran
end
set xact_abort off

if len(@NoticeUserID)>0
begin
 set @NoticeUserID = substring(@NoticeUserID,1,len(@NoticeUserID)-1)
end
--set @NoticeUserID='100,200'

return 0

GO
