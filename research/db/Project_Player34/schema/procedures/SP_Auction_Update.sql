-- SQL_STORED_PROCEDURE dbo.SP_Auction_Update (modified 2021-06-04T05:18:34.763)


-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<拍卖行：更新拍卖信息>
-- =============================================
CREATE    PROCEDURE [dbo].[SP_Auction_Update] 
 @AuctionID int, 
 @AuctioneerID int, 
 @AuctioneerName nvarchar(100), 
 @BeginDate DateTime, 
 @BuyerID int, 
 @BuyerName nvarchar(100), 
 @IsExist bit, 
 @ItemID int, 
 @Mouthful int, 
 @PayType int, 
 @Price int, 
 @Rise int, 
 @ValidDate int,
 @Name nvarchar(200),
 @Category int,
 @Cess float

AS  

declare @OldBuyerID int
declare @OldBuyerName nvarchar(100)
declare @OldPrice int
declare @flat decimal(18,2)   --定义扣税
declare @NewPrice int	      --扣税后的价格
Set @flat=0.00               --设置扣税
Select @flat=IsNull(Value,0.10) From Server_Config Where Name='Cess'
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

set @SenderID =0
set @Sender = dbo.GetTranslation('SP_Auction_Update.Sender')--'弹弹堂拍卖中心' 
set @ReceiverID = @OldBuyerID
set @Receiver = @OldBuyerName
set @Title = dbo.GetTranslation('SP_Auction_Update.Title')--'拍卖返回!'
set @Content = dbo.GetTranslation('SP_Auction_Update.Content')--'拍卖返回!'
set @SendTime  = getdate()
set @IsRead  = 0
set @IsDelR = 0
set @IfDelS = 0
set @IsDelete =0
set @Annex1 =''
set @Annex2 =''
set @Gold =0
set @Money =0

select @OldBuyerID= BuyerID,@OldBuyerName=BuyerName,@OldPrice=Price from Auction where AuctionID=@AuctionID and IsExist=1 and (DATEADD(mi, Random, BeginDate) < GETDATE())

if @OldBuyerID is null 
 begin
   return 1
 end

if @PayType = 0
 begin
   set @Gold = @OldPrice
 end
else
 begin
   set @Money = @OldPrice 
 end

set xact_abort on 
begin tran

  update Auction set BuyerID=@BuyerID,BuyerName=@BuyerName,IsExist=@IsExist,Price=@Price where AuctionID=@AuctionID and IsExist=1
 
  if @@error<>0 or @@ROWCOUNT =0
    begin
      rollback tran
      return 2
   end

 if @OldBuyerID<>0
   begin
    
    set @Title = dbo.GetTranslation('SP_Auction_Update.Msg1') + @Name +'!'--'竞标失败:    ' + @Name +'!'
    set @Content = dbo.GetTranslation('SP_Auction_Update.Msg2')--'您竞标的  '+ @Name + '  价格被 <'+@BuyerName+'> 超出，返回' + cast(@Money as varchar(20))  +'点券!'
    set @Content = REPLACE(@Content,'{0}',@Name)
    set @Content = REPLACE(@Content,'{1}',@BuyerName)
    set @Content = REPLACE(@Content,'{2}',cast(@Money as varchar(20)))
    set @Remark = 'Gold:'+cast(@Gold as varchar(20))+',Money:'+cast(@Money as varchar(20))+',Annex1:'+@Annex1+',Annex2:'+@Annex2

    INSERT INTO User_Messages( SenderID, Sender, ReceiverID, Receiver, Title, Content, SendTime, IsRead, IsDelR, IfDelS, IsDelete, Annex1, Annex2, Gold, Money, IsExist,Type,Remark) 
       VALUES( @SenderID, @Sender, @OldBuyerID, @OldBuyerName, @Title, @Content, @SendTime, @IsRead, @IsDelR, @IfDelS, @IsDelete, @Annex1, @Annex2, @Gold, @Money, 1,5,@Remark)

   if @@error<>0  
      begin
        rollback tran
        return 3
      end
   end



  if @Price >= @Mouthful and @Mouthful<>0
    begin
     
    set @Title = dbo.GetTranslation('SP_Auction_Update.Msg3') + @Name +'!'--'竞标成功:    ' + @Name +'!'
    set @Content = dbo.GetTranslation('SP_Auction_Update.Msg4') --'您成功竞标<'+@AuctioneerName+'>拍卖的  '+ @Name + '  ,支付' + cast(@Price as varchar(20))  +'点券!'
    set @Content = REPLACE(@Content,'{0}',@AuctioneerName)
    set @Content = REPLACE(@Content,'{1}',@Name)
    set @Content = REPLACE(@Content,'{2}',cast(@Price as varchar(20)))
    set @Remark = 'Gold:0,Money:0,Annex1:'+cast(@ItemID as varchar(20))+',Annex2:'+@Annex2
    INSERT INTO User_Messages( SenderID, Sender, ReceiverID, Receiver, Title, Content, SendTime, IsRead, IsDelR, IfDelS, IsDelete, Annex1, Annex2, Gold, Money, IsExist,Type,Remark) 
           VALUES( @SenderID, @Sender, @BuyerID, @BuyerName, @Title, @Content, @SendTime, @IsRead, @IsDelR, @IfDelS, @IsDelete, @ItemID, @Annex2, 0, 0, 1,4,@Remark)

     if @@error<>0  
       begin
        rollback tran
        return 4
       end

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
    set @NewPrice=@Price-round(@flat*@Price,0)
    set @Title = dbo.GetTranslation('SP_Auction_Update.Msg5') + @Name +'!'--'拍卖成功:    ' + @Name +'!'
    If @flat>0
    Begin
        set @Content = dbo.GetTranslation('SP_Auction_Update.Msg6')--'您所拍卖的  '+ @Name + '  被 <'+@BuyerName+'> 购买,一共获得' + cast(@Price as varchar(20))  +'点券!'
        set @Content = REPLACE(@Content,'{3}',cast(@Price-@NewPrice as varchar(20)))
    End
    Else
    Begin
        set @Content = dbo.GetTranslation('SP_Auction_Update.Msg7')--'您所拍卖的  '+ @Name + '  被 <'+@BuyerName+'> 购买,一共获得' + cast(@Price as varchar(20))  +'点券!'
    End

    set @Content = REPLACE(@Content,'{0}',@Name)
    set @Content = REPLACE(@Content,'{1}',@BuyerName)
    set @Content = REPLACE(@Content,'{2}',cast(@Price as varchar(20)))
    set @Content = REPLACE(@Content,'{4}',cast(@NewPrice*0.9 as varchar(20)))
    set @Remark = 'Gold:'+cast(@Gold as varchar(20))+',Money:'+cast(@NewPrice*0.9 as varchar(20))+',Annex1:'+@Annex1+',Annex2:'+@Annex2

        INSERT INTO User_Messages( SenderID, Sender, ReceiverID, Receiver, Title, Content, SendTime, IsRead, IsDelR, IfDelS, IsDelete, Annex1, Annex2, Gold, Money, IsExist,Type,Remark) 
     VALUES( @SenderID, @Sender, @AuctioneerID, @AuctioneerName, @Title, @Content, @SendTime, @IsRead, @IsDelR, @IfDelS, @IsDelete, @Annex1, @Annex2, @Gold, @NewPrice*0.9, 1,2,@Remark)

     if @@error<>0  
       begin
        rollback tran
        return 5
       end

    end

commit tran
set xact_abort off
return 0


GO
